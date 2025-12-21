// Supabase Edge Function for handling Stripe webhooks
// Deploy this to Supabase: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

    // Verify webhook signature
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    console.log('Received event:', event.type)

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const userId = paymentIntent.metadata.user_id
        const planType = paymentIntent.metadata.plan_type

        if (!userId || !planType) {
          console.error('Missing metadata in payment intent')
          break
        }

        // Calculate subscription end date
        const startDate = new Date()
        const endDate = new Date()
        if (planType === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1)
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1)
        }

        // Update user profile with subscription status
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_status: planType === 'monthly' ? 'premium_monthly' : 'premium_yearly',
            subscription_start_date: startDate.toISOString(),
            subscription_end_date: endDate.toISOString(),
          })
          .eq('id', userId)

        if (profileError) {
          console.error('Error updating profile:', profileError)
        }

        // Create subscription record
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_customer_id: paymentIntent.customer as string,
            stripe_subscription_id: paymentIntent.id,
            status: 'active',
            plan_type: planType,
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
          })

        if (subError) {
          console.error('Error creating subscription:', subError)
        }

        console.log(`Payment successful for user ${userId}, plan: ${planType}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const userId = paymentIntent.metadata.user_id

        console.error(`Payment failed for user ${userId}`)
        // You could notify the user via email or push notification here
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          // Update user to free tier
          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_status: 'free',
              subscription_end_date: new Date().toISOString(),
            })
            .eq('id', profile.id)

          // Update subscription record
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId)

          console.log(`Subscription canceled for customer ${customerId}`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          const endDate = new Date(subscription.current_period_end * 1000)

          await supabaseAdmin
            .from('user_profiles')
            .update({
              subscription_end_date: endDate.toISOString(),
            })
            .eq('id', profile.id)

          await supabaseAdmin
            .from('subscriptions')
            .update({
              current_period_end: endDate.toISOString(),
              status: subscription.status,
            })
            .eq('stripe_customer_id', customerId)

          console.log(`Subscription updated for customer ${customerId}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
