// Supabase Edge Function: sleep-reminder-scheduler
// Scheduled to run every hour to send personalized sleep reminders based on user timezone.
// 
// Schedule via Supabase Cron (hourly):
//   SELECT cron.schedule('hourly-sleep-reminder', '0 * * * *', $$
//     SELECT net.http_post(url:='https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/sleep-reminder-scheduler',
//       headers:='{"Authorization": "Bearer <anon-key>"}'::jsonb) AS request_id;
//   $$);
//
// Deploy: supabase functions deploy sleep-reminder-scheduler --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface ReminderConfig {
    title: string
    messages: string[]
    emoji: string
    data: Record<string, string>
}

// Reminder content for each time slot
const REMINDERS: Record<string, ReminderConfig> = {
    morning: {
        title: '🌅 Good Morning! Sleep Review Ready',
        emoji: '🌅',
        messages: [
            'How did you sleep last night? Open your Journal to review your sleep data.',
            'Your sleep report for last night is ready. Tap to see your score! 📊',
            'Rise and shine! Check your sleep insights from last night in the app.',
            'Morning! Your AI sleep analysis is ready. See how last night went 🌙',
            'Good morning! Review your sleep recordings from last night in your Journal.',
        ],
        data: { screen: 'Journal', tab: 'entries' }
    },
    evening: {
        title: '🌆 Prepare for a Great Night\'s Sleep',
        emoji: '🌆',
        messages: [
            'Evening! Start winding down — put your phone down 30 min before bed for better sleep. 🌙',
            'Your optimal bedtime is approaching. Start relaxing to improve your sleep score tonight!',
            'Evening reminder: Dim your lights and avoid screens to trigger your sleep hormones. 🌜',
            'Get ready for sleep! Avoid caffeine and blue light for the next hour before bed. ⚡',
            'Sleep tip: A warm shower 1-2 hours before bed can lower your core temperature and improve sleep quality! 🛁',
        ],
        data: { screen: 'Dashboard' }
    },
    night: {
        title: '🌙 Time to Sleep!',
        emoji: '🌙',
        messages: [
            'It\'s bedtime! Start a sleep recording session to track tonight\'s sleep. Sweet dreams! 😴',
            'Ready to sleep? Enable Do Not Disturb and start your sleep tracker for the best insights.',
            'Sleep time! Remember: 7-9 hours a night is the sweet spot for optimal health. Good night! 🌟',
            'Night night! Start your sleep session to get personalised insights tomorrow morning. 🌙',
            '🌙 Time to rest! Turn on sleep tracking to see how well you sleep tonight.',
        ],
        data: { screen: 'SleepSession' }
    }
}

// Configuration for local delivery times
const DELIVERY_WINDOWS = [
    { hour: 8, type: 'morning' },   // 8:00 AM local
    { hour: 19, type: 'evening' }, // 7:00 PM local
    { hour: 22, type: 'night' }    // 10:00 PM local
]

serve(async (req) => {
    try {
        console.log(`🔔 Starting hourly sleep reminder scheduler...`)

        // 1. Fetch all users who have push tokens AND timezones
        const profilesRes = await fetch(
            `${SUPABASE_URL}/rest/v1/user_profiles?select=id,expo_push_token,timezone&expo_push_token=not.is.null`,
            {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                }
            }
        )

        const profiles = await profilesRes.json()
        const usersWithTokens = profiles.filter((p: any) => p.expo_push_token)

        console.log(`📱 Found ${usersWithTokens.length} users with push tokens`)

        if (usersWithTokens.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No users with push tokens found' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        const now = new Date()
        const messagesToSend: any[] = []

        // 2. Identify which users should receive a notification right now based on their local time
        for (const profile of usersWithTokens) {
            const timezone = profile.timezone || 'UTC'

            try {
                // Get local hour for this user
                const localTimeStr = now.toLocaleString("en-US", { timeZone: timezone, hour: 'numeric', hour12: false })
                const localHour = parseInt(localTimeStr)

                // Find if this hour matches a delivery window
                const window = DELIVERY_WINDOWS.find(w => w.hour === localHour)

                if (window) {
                    const config = REMINDERS[window.type]
                    const randomMessage = config.messages[Math.floor(Math.random() * config.messages.length)]

                    messagesToSend.push({
                        to: profile.expo_push_token,
                        sound: 'default',
                        title: config.title,
                        body: randomMessage,
                        data: config.data,
                        priority: 'normal',
                        badge: 1,
                    })
                }
            } catch (tzError) {
                console.error(`❌ Invalid timezone for user ${profile.id}: ${timezone}`)
            }
        }

        console.log(`🎯 Targeted ${messagesToSend.length} users for this hour`)

        if (messagesToSend.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No reminders to send this hour', targeted: 0 }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // 3. Batch and send notifications via Expo
        const batchSize = 100
        const results = []

        for (let i = 0; i < messagesToSend.length; i += batchSize) {
            const batch = messagesToSend.slice(i, i + batchSize)

            const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(batch)
            })

            const pushData = await pushRes.json()
            results.push(pushData)
            console.log(`✅ Sent batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(messagesToSend.length / batchSize)}`)
        }

        return new Response(
            JSON.stringify({
                success: true,
                sent: messagesToSend.length,
                batches: results.length,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ Scheduler error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
