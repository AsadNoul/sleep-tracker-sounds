import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { userId, title, body, data, image, subtitle, badge, sound, priority, channelId } = await req.json()

    // Validate input
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'Title and body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get user's push token from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    let pushTokens: string[] = []

    if (userId) {
      // Send to specific user
      const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}&select=expo_push_token`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      })
      const users = await response.json()
      pushTokens = users.map((u: any) => u.expo_push_token).filter(Boolean)
    } else {
      // Send to all users with push tokens
      const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?select=expo_push_token&expo_push_token=not.is.null`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      })
      const users = await response.json()
      pushTokens = users.map((u: any) => u.expo_push_token).filter(Boolean)
    }

    if (pushTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No push tokens found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send push notifications via Expo
    const messages = pushTokens.map(token => {
      const message: any = {
        to: token,
        sound: sound || 'default',
        title,
        body,
        data: data || {},
      }

      // Add optional fields if provided
      if (subtitle) message.subtitle = subtitle
      if (badge !== undefined) message.badge = badge
      if (priority) message.priority = priority
      if (channelId) message.channelId = channelId

      // Add image (works on Android with FCM, iOS shows in notification center)
      if (image) {
        message.data = {
          ...message.data,
          image, // Image URL for custom handling
        }
        // For Android rich notifications
        message.image = image
      }

      return message
    })

    const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    })

    const expoPushData = await expoPushResponse.json()

    console.log('Push notifications sent:', {
      totalTokens: pushTokens.length,
      responses: expoPushData,
    })

    return new Response(
      JSON.stringify({
        success: true,
        sentTo: pushTokens.length,
        responses: expoPushData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending push notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
