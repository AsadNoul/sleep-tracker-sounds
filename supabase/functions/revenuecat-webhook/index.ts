// Supabase Edge Function for handling RevenueCat webhooks
// Deploy this to Supabase: supabase functions deploy revenuecat-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  try {
    // Security Layer 1: Verify RevenueCat Authorization header
    const authHeader = req.headers.get('Authorization')
    const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')

    if (webhookSecret && authHeader !== webhookSecret) {
      console.error('Invalid webhook authorization')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Security Layer 2 (Optional): Verify IP address is from RevenueCat
    // RevenueCat webhooks come from these IPs: 44.235.75.0/24, 44.226.150.0/24
    // Uncomment below to enable IP whitelisting:
    /*
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
    const allowedIpRanges = ['44.235.75.', '44.226.150.']
    const isAllowedIp = allowedIpRanges.some(range => clientIp?.startsWith(range))

    if (!isAllowedIp) {
      console.error('Webhook from unauthorized IP:', clientIp)
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    */

    const body = await req.json()
    console.log('Received RevenueCat webhook:', JSON.stringify(body, null, 2))

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const event = body.event
    const userId = event?.app_user_id // This is the user ID you set in RevenueCat

    if (!userId) {
      console.error('No user ID in webhook')
      return new Response(JSON.stringify({ error: 'No user ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Skip anonymous users - they need to log in first
    if (userId.startsWith('$RCAnonymousID:')) {
      console.log('⚠️ Skipping webhook for anonymous user:', userId)
      console.log('User needs to sign in/sign up to activate premium')
      return new Response(
        JSON.stringify({
          received: true,
          message: 'Anonymous user - subscription will activate after login'
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Handle different event types
    switch (event?.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'NON_RENEWING_PURCHASE': {
        // User purchased or renewed subscription
        const productId = event.product_id
        const expiresDate = event.expiration_at_ms
          ? new Date(event.expiration_at_ms)
          : null
        const purchaseDate = event.purchased_at_ms
          ? new Date(event.purchased_at_ms)
          : new Date()

        // Determine subscription type from product ID
        let subscriptionType = 'free'
        if (productId?.includes('monthly')) {
          subscriptionType = 'premium_monthly'
        } else if (productId?.includes('yearly') || productId?.includes('annual')) {
          subscriptionType = 'premium_yearly'
        }

        console.log(`Processing purchase for user ${userId}, product: ${productId}, type: ${subscriptionType}`)

        // Update user profile with subscription status
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_status: subscriptionType,
            subscription_start_date: purchaseDate.toISOString(),
            subscription_end_date: expiresDate?.toISOString() || null,
          })
          .eq('id', userId)

        if (profileError) {
          console.error('Error updating profile:', profileError)
        } else {
          console.log(`✅ Updated user profile for ${userId}`)
        }

        // Create or update subscription record
        const { error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            revenuecat_customer_id: event.app_user_id,
            status: 'active',
            plan_type: subscriptionType,
            current_period_start: purchaseDate.toISOString(),
            current_period_end: expiresDate?.toISOString() || null,
            product_id: productId,
          }, {
            onConflict: 'user_id'
          })

        if (subError) {
          console.error('Error creating/updating subscription:', subError)
        } else {
          console.log(`✅ Updated subscription record for ${userId}`)
        }

        break
      }

      case 'CANCELLATION': {
        // User canceled subscription (but it's still active until expiration)
        console.log(`Subscription canceled for user ${userId}`)

        const expiresDate = event.expiration_at_ms
          ? new Date(event.expiration_at_ms)
          : new Date()

        // Don't change status to free yet, just mark as canceled
        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            current_period_end: expiresDate.toISOString(),
          })
          .eq('user_id', userId)

        console.log(`✅ Marked subscription as canceled for ${userId}`)
        break
      }

      case 'EXPIRATION': {
        // Subscription expired, downgrade to free
        console.log(`Subscription expired for user ${userId}`)

        await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_status: 'free',
            subscription_end_date: new Date().toISOString(),
          })
          .eq('id', userId)

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'expired',
          })
          .eq('user_id', userId)

        console.log(`✅ Downgraded user ${userId} to free tier`)
        break
      }

      case 'BILLING_ISSUE': {
        // Payment failed
        console.error(`Billing issue for user ${userId}`)

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('user_id', userId)

        console.log(`✅ Marked subscription as past_due for ${userId}`)
        break
      }

      case 'PRODUCT_CHANGE': {
        // User changed subscription plan (e.g., monthly to yearly)
        const newProductId = event.product_id
        let newSubscriptionType = 'free'

        if (newProductId?.includes('monthly')) {
          newSubscriptionType = 'premium_monthly'
        } else if (newProductId?.includes('yearly') || newProductId?.includes('annual')) {
          newSubscriptionType = 'premium_yearly'
        }

        const expiresDate = event.expiration_at_ms
          ? new Date(event.expiration_at_ms)
          : null

        console.log(`Product changed for user ${userId} to ${newProductId}`)

        await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_status: newSubscriptionType,
            subscription_end_date: expiresDate?.toISOString() || null,
          })
          .eq('id', userId)

        await supabaseAdmin
          .from('subscriptions')
          .update({
            plan_type: newSubscriptionType,
            product_id: newProductId,
            current_period_end: expiresDate?.toISOString() || null,
          })
          .eq('user_id', userId)

        console.log(`✅ Updated plan for user ${userId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event?.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
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
