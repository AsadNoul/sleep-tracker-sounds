import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

/**
 * Edge Function to send crash reports via email
 * Uses Resend API (free tier: 3,000 emails/month)
 * Alternative: SendGrid, Mailgun, or your SMTP
 */

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { adminEmail, report } = await req.json()

    // Validate input
    if (!adminEmail || !report) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Format email content
    const emailSubject = `🚨 App Crash: ${report.severity.toUpperCase()} - ${report.error.substring(0, 50)}`

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: #E57373; color: white; padding: 20px; border-radius: 5px; }
    .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
    .label { font-weight: bold; color: #555; }
    .code { background: #272822; color: #f8f8f2; padding: 10px; border-radius: 3px; overflow-x: auto; font-family: 'Courier New', monospace; }
    .critical { color: #E57373; }
    .error { color: #FF9800; }
    .warning { color: #FFC107; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 Sleep Tracker App Crash Report</h1>
    <p>Severity: <span class="${report.severity}">${report.severity.toUpperCase()}</span></p>
  </div>

  <div class="section">
    <h2>📱 Error Details</h2>
    <p><span class="label">Error:</span> ${report.error}</p>
    <p><span class="label">Time:</span> ${new Date(report.timestamp).toLocaleString()}</p>
  </div>

  ${report.errorStack ? `
  <div class="section">
    <h2>📋 Stack Trace</h2>
    <pre class="code">${report.errorStack}</pre>
  </div>
  ` : ''}

  ${report.componentStack ? `
  <div class="section">
    <h2>🔧 Component Stack</h2>
    <pre class="code">${report.componentStack}</pre>
  </div>
  ` : ''}

  <div class="section">
    <h2>📱 Device Information</h2>
    <p><span class="label">Model:</span> ${report.deviceInfo.model}</p>
    <p><span class="label">OS:</span> ${report.deviceInfo.osName} ${report.deviceInfo.osVersion}</p>
    <p><span class="label">App Version:</span> ${report.deviceInfo.appVersion} (Build ${report.deviceInfo.buildVersion})</p>
  </div>

  ${report.userInfo ? `
  <div class="section">
    <h2>👤 User Information</h2>
    <p><span class="label">User ID:</span> ${report.userInfo.userId || 'N/A'}</p>
    <p><span class="label">Email:</span> ${report.userInfo.email || 'N/A'}</p>
  </div>
  ` : ''}

  <div class="section">
    <h2>🔗 Next Steps</h2>
    <ul>
      <li>Check the Supabase database for more details</li>
      <li>Review the error stack trace above</li>
      <li>Test the specific scenario that caused this crash</li>
      <li>Deploy a fix and monitor for similar errors</li>
    </ul>
  </div>
</body>
</html>
    `

    // Option 1: Use Resend (Recommended - Free tier available)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (RESEND_API_KEY) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sleep Tracker App <crashes@yourdomain.com>', // Change this
          to: [adminEmail],
          subject: emailSubject,
          html: emailBody,
        }),
      })

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text()
        throw new Error(`Resend API error: ${errorText}`)
      }

      const result = await resendResponse.json()

      return new Response(JSON.stringify({
        success: true,
        message: 'Crash report email sent',
        emailId: result.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Option 2: Log to console if no email service configured
    console.log('📧 EMAIL CONTENT (No email service configured):')
    console.log('To:', adminEmail)
    console.log('Subject:', emailSubject)
    console.log('Body:', emailBody)

    return new Response(JSON.stringify({
      success: true,
      message: 'Crash report logged (email service not configured)',
      note: 'Configure RESEND_API_KEY in Supabase secrets to enable email notifications'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('Error in send-crash-report function:', error)

    return new Response(JSON.stringify({
      error: 'Failed to send crash report',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
