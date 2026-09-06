import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

interface BookingPayload {
	name: string;
	email: string;
	service: string;
	timeline?: string;
	details: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_json' }, { status: 400 });
	}

	const payload = body as Partial<BookingPayload>;

	if (!payload.name || !payload.email || !payload.details) {
		return json({ error: 'name, email, and details are required' }, { status: 422 });
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
		return json({ error: 'invalid_email' }, { status: 422 });
	}
	// Keep abuse surface small: cap input lengths server-side.
	if (payload.name.length > 120 || payload.email.length > 254 || payload.details.length > 5000) {
		return json({ error: 'input_too_long' }, { status: 422 });
	}

	const env = (platform?.env ?? {}) as {
		RESEND_API_KEY?: string;
		BOOKING_EMAIL?: string;
		BOOKING_FROM?: string;
	};
	if (!env.RESEND_API_KEY || !env.BOOKING_EMAIL) {
		console.error('[booking] server not configured: missing RESEND_API_KEY or BOOKING_EMAIL');
		return json({ error: 'server_not_configured' }, { status: 500 });
	}

	const emailBody = [
		`Name: ${payload.name}`,
		`Email: ${payload.email}`,
		`Service: ${payload.service || 'Not specified'}`,
		`Timeline: ${payload.timeline || 'Not specified'}`,
		'',
		'Details:',
		payload.details
	].join('\n');

	const send = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.RESEND_API_KEY}`
		},
		body: JSON.stringify({
			from: env.BOOKING_FROM || 'pwn4g3 <onboarding@resend.dev>',
			to: [env.BOOKING_EMAIL],
			subject: `Booking request from ${payload.name}`,
			text: emailBody
		})
	});

	if (!send.ok) {
		console.error('[booking] resend failed', send.status);
		return json({ error: 'send_failed' }, { status: 502 });
	}

	return json({ ok: true }, { status: 200 });
};