// Supabase Edge Function to delete user account using Admin API
// Deploy: supabase functions deploy delete-user-account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Not authenticated')
    }

    console.log(`Deleting account for user: ${user.id}`)

    // Delete user data from all tables (client-side already did this, but double-check)
    const deletePromises = [
      supabaseClient.from('sleep_sessions').delete().eq('user_id', user.id),
      supabaseClient.from('sleep_insights').delete().eq('user_id', user.id),
      supabaseClient.from('analytics_events').delete().eq('user_id', user.id),
      supabaseClient.from('journal_entries').delete().eq('user_id', user.id),
      supabaseClient.from('bedtime_routines').delete().eq('user_id', user.id),
      supabaseClient.from('room_environment').delete().eq('user_id', user.id),
      supabaseClient.from('user_settings').delete().eq('user_id', user.id),
      supabaseClient.from('user_profiles').delete().eq('id', user.id),
    ]

    await Promise.all(deletePromises)

    // Create admin client to delete auth user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Delete the auth user using admin API
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError)
      throw deleteAuthError
    }

    console.log(`✅ Successfully deleted account: ${user.id}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-user-account:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
