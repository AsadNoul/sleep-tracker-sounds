// Supabase Edge Function for RevenueCat REST API operations
// This uses the SECRET API KEY for server-side operations
// Deploy: npx supabase functions deploy revenuecat-api

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1'

serve(async (req) => {
  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action, user_id } = body

    // Get RevenueCat secret key from environment
    const secretKey = Deno.env.get('REVENUECAT_SECRET_API_KEY')
    if (!secretKey) {
      console.error('REVENUECAT_SECRET_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Process different actions
    switch (action) {
      case 'get_subscriber': {
        // Get subscriber information from RevenueCat
        const subscriberId = user_id || user.id

        const response = await fetch(
          `${REVENUECAT_API_BASE}/subscribers/${subscriberId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            }
          }
        )

        if (!response.ok) {
          const error = await response.text()
          console.error('RevenueCat API error:', error)
          return new Response(JSON.stringify({ error: 'Failed to get subscriber' }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const data = await response.json()
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      case 'grant_promotional_entitlement': {
        // Grant promotional access to a user
        const { entitlement_id, duration } = body
        const subscriberId = user_id || user.id

        const response = await fetch(
          `${REVENUECAT_API_BASE}/subscribers/${subscriberId}/entitlements/${entitlement_id}/promotional`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              duration: duration || 'monthly', // 'weekly', 'monthly', 'two_month', 'three_month', 'six_month', 'yearly', 'lifetime'
              start_time_ms: Date.now(),
            })
          }
        )

        if (!response.ok) {
          const error = await response.text()
          console.error('Failed to grant promotional access:', error)
          return new Response(JSON.stringify({ error: 'Failed to grant access' }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const data = await response.json()
        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      case 'revoke_promotional_entitlement': {
        // Revoke promotional access
        const { entitlement_id } = body
        const subscriberId = user_id || user.id

        const response = await fetch(
          `${REVENUECAT_API_BASE}/subscribers/${subscriberId}/entitlements/${entitlement_id}/revoke_promotionals`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            }
          }
        )

        if (!response.ok) {
          const error = await response.text()
          console.error('Failed to revoke promotional access:', error)
          return new Response(JSON.stringify({ error: 'Failed to revoke access' }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const data = await response.json()
        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      case 'delete_subscriber': {
        // Delete subscriber (GDPR compliance)
        const subscriberId = user_id || user.id

        const response = await fetch(
          `${REVENUECAT_API_BASE}/subscribers/${subscriberId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${secretKey}`,
            }
          }
        )

        if (!response.ok) {
          const error = await response.text()
          console.error('Failed to delete subscriber:', error)
          return new Response(JSON.stringify({ error: 'Failed to delete subscriber' }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      case 'update_subscriber_attributes': {
        // Update custom attributes for a subscriber
        const { attributes } = body
        const subscriberId = user_id || user.id

        const response = await fetch(
          `${REVENUECAT_API_BASE}/subscribers/${subscriberId}/attributes`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ attributes })
          }
        )

        if (!response.ok) {
          const error = await response.text()
          console.error('Failed to update attributes:', error)
          return new Response(JSON.stringify({ error: 'Failed to update attributes' }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        const data = await response.json()
        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
    }

  } catch (error: any) {
    console.error('Edge function error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
