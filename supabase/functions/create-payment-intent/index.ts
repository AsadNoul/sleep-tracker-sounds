// Supabase Edge Function for creating Stripe payment intents
// Deploy this to Supabase: supabase functions deploy create-payment-intent

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import Stripe from 'https://esm.sh/stripe@17.3.1?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader)

    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify the JWT token and get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token)

    console.log('getUser result:', { hasUser: !!user, error: userError?.message })

    if (userError) {
      console.error('User authentication error:', userError)
      throw new Error(`Authentication failed: ${userError.message}`)
    }

    if (!user) {
      throw new Error('User not authenticated')
    }

    console.log('Authenticated user:', user.id, user.email)

    // Parse request body
    const { priceId, planType, testMode } = await req.json()

    if (!priceId || !planType) {
      throw new Error('Missing required fields: priceId, planType')
    }

    const useTestMode = !!testMode

    // Select Stripe secret key based on mode
    const stripeSecretKey = useTestMode
      ? Deno.env.get('STRIPE_TEST_SECRET_KEY') ?? Deno.env.get('STRIPE_SECRET_KEY')
      : Deno.env.get('STRIPE_SECRET_KEY')

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    // Initialize Stripe with proper mode
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Resolve price from Stripe to ensure correct amount/currency for the given priceId
    let amount = planType === 'monthly' ? 499 : 4999 // fallback amounts
    let currency = 'usd'

    try {
      const price = await stripe.prices.retrieve(priceId)
      if (price?.unit_amount) amount = price.unit_amount
      if (price?.currency) currency = price.currency
    } catch (priceError) {
      console.error('Price lookup failed, using fallback amount:', priceError)
    }

    // Check if customer already exists in Stripe
    let customerId: string | null = null

    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profile?.stripe_customer_id) {
      try {
        const existingCustomer = await stripe.customers.retrieve(profile.stripe_customer_id)
        // If not deleted and found, use it
        // @ts-ignore - Stripe types for "deleted" union
        if (!existingCustomer?.deleted) {
          customerId = existingCustomer.id
        }
      } catch (custError) {
        console.error('Stored customer invalid for this Stripe environment, recreating:', custError)
      }
    }

    if (!customerId) {
      // Create new Stripe customer for the current environment (test/live)
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to database
      await supabaseClient
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata: {
        user_id: user.id,
        price_id: priceId,
        plan_type: planType,
        test_mode: useTestMode,
      },
      // Explicitly specify payment method types
      payment_method_types: ['card'],
    })

    // Create ephemeral key for customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    )

    // Return the necessary data for the mobile client
    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        publishableKey: useTestMode
          ? Deno.env.get('STRIPE_TEST_PUBLISHABLE_KEY') ?? Deno.env.get('STRIPE_PUBLISHABLE_KEY')
          : Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
