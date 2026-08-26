const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export const onRequestPost = async ({ request, env }) => {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { name, email, service, timeline, details } = body
  if (!name || !email || !details) {
    return json({ error: 'name, email and details are required' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email address' }, 400)
  }
  if (!env.RESEND_API_KEY || !env.BOOKING_EMAIL) {
    return json({ error: 'Server not configured' }, 500)
  }

  const emailBody = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Service: ${service || 'Not specified'}`,
    `Timeline: ${timeline || 'Not specified'}`,
    '',
    'Details:',
    details,
  ].join('\n')

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.BOOKING_FROM || 'pwn4g3 <onboarding@resend.dev>',
      to: [env.BOOKING_EMAIL],
      subject: `Booking request from ${name}`,
      text: emailBody,
    }),
  })

  if (!send.ok) {
    return json({ error: 'Failed to send booking email' }, 502)
  }

  return json({ ok: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}