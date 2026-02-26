// Supabase Edge Function: purchase-confirmation-email
// Triggered from the revenuecat-webhook function after a successful purchase.
// Also can be called directly via POST for testing.
// Deploy: supabase functions deploy purchase-confirmation-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'noreply@naulx.com'
const APP_NAME = 'Sleep Tracker Pro'

serve(async (req) => {
    try {
        if (req.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 })
        }

        const body = await req.json()
        const { userId, eventType, productId, planType, expiresDate } = body

        console.log(`📧 Processing purchase email for user=${userId}, event=${eventType}, plan=${planType}`)

        if (!userId) {
            return new Response(JSON.stringify({ error: 'userId is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Initialize Supabase with service role key to fetch user email
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Fetch user email from user_profiles + auth.users via service role
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            console.error('❌ Could not fetch user profile:', profileError)
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // Fetch email from auth.users using admin API
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

        if (authError || !authUser?.user?.email) {
            console.error('❌ Could not fetch user email:', authError)
            return new Response(JSON.stringify({ error: 'Could not retrieve user email' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const userEmail = authUser.user.email
        const userName = profile.first_name || 'Valued Member'
        const planDisplayName = planType?.includes('yearly') ? 'Annual Premium' : 'Monthly Premium'
        const formattedExpiry = expiresDate
            ? new Date(expiresDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : 'N/A'

        // Build email content based on event type
        let subject = `Welcome to ${APP_NAME} Premium! 🌙`
        let bodyHtml = ''

        if (eventType === 'RENEWAL') {
            subject = `Your ${APP_NAME} subscription has been renewed ✨`
            bodyHtml = `
        <p>Hi ${userName},</p>
        <p>Your <strong>${planDisplayName}</strong> subscription has been successfully renewed.</p>
        <ul>
          <li><strong>Plan:</strong> ${planDisplayName}</li>
          <li><strong>Product:</strong> ${productId}</li>
          <li><strong>Next Renewal:</strong> ${formattedExpiry}</li>
        </ul>
        <p>Continue enjoying uninterrupted deep sleep tracking, smart insights, and all premium features!</p>
      `
        } else if (eventType === 'CANCELLATION') {
            subject = `Your ${APP_NAME} subscription has been cancelled`
            bodyHtml = `
        <p>Hi ${userName},</p>
        <p>Your <strong>${planDisplayName}</strong> subscription has been cancelled. You will continue to have access to premium features until <strong>${formattedExpiry}</strong>.</p>
        <p>We're sorry to see you go. If you change your mind, you can resubscribe anytime from the app.</p>
        <p>Thank you for being part of ${APP_NAME}! 🌙</p>
      `
        } else {
            // INITIAL_PURCHASE or NON_RENEWING_PURCHASE
            bodyHtml = `
        <p>Hi ${userName},</p>
        <p>🎉 Thank you for subscribing to <strong>${APP_NAME} ${planDisplayName}</strong>!</p>
        <p><strong>Your subscription details:</strong></p>
        <ul>
          <li><strong>Plan:</strong> ${planDisplayName}</li>
          <li><strong>Product:</strong> ${productId}</li>
          <li><strong>Valid Until:</strong> ${formattedExpiry}</li>
        </ul>
        <p>You now have access to:</p>
        <ul>
          <li>🎙️ Full sleep recording & noise detection</li>
          <li>📊 Advanced sleep analytics & AI insights</li>
          <li>🌙 Smart sleep reminders</li>
          <li>🔔 Personalised sleep coaching</li>
        </ul>
        <p>Sleep tight! 🌟<br/>The ${APP_NAME} Team</p>
      `
        }

        const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0F172A; color: #E2E8F0; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #1E293B; border-radius: 16px; padding: 40px; }
          h1 { color: #8B5CF6; font-size: 24px; margin-bottom: 8px; }
          .badge { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 24px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 8px; color: #CBD5E1; }
          strong { color: #F1F5F9; }
          .footer { margin-top: 32px; font-size: 12px; color: #64748B; border-top: 1px solid #334155; padding-top: 20px; }
          a { color: #8B5CF6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🌙 ${APP_NAME}</h1>
          <div class="badge">PREMIUM</div>
          ${bodyHtml}
          <div class="footer">
            <p>This email was sent to ${userEmail}. If you did not make this purchase, please contact <a href="mailto:support@naulx.com">support@naulx.com</a> immediately.</p>
            <p>${APP_NAME} | <a href="https://naulx.com">naulx.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `

        // Send email via Resend API
        if (!RESEND_API_KEY) {
            console.warn('⚠️ RESEND_API_KEY not set, skipping email send. Would have sent to:', userEmail)
            console.log('Email subject:', subject)
            return new Response(JSON.stringify({ success: true, message: 'Email skipped (no API key), logged to console' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [userEmail],
                subject,
                html: fullHtml,
            })
        })

        const emailData = await emailRes.json()
        console.log('📧 Email sent:', emailData)

        return new Response(
            JSON.stringify({ success: true, emailId: emailData.id, sentTo: userEmail }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ Email function error:', error.message)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
