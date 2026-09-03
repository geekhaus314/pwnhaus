import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

interface BookingPayload {
	name: string;
	email: string;
	service: string;
	timeline?: string;
	details: string;
}

export const POST: RequestHandler = async ({ request }) => {
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

	// In production this forwards to the Cloudflare Worker or an email service.
	// For now it logs and returns success so the form flow works end-to-end.
	console.info('[booking]', {
		name: payload.name,
		email: payload.email,
		service: payload.service,
		timeline: payload.timeline,
		details: payload.details?.slice(0, 120)
	});

	return json({ ok: true }, { status: 200 });
};
