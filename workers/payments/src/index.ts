import { corsHeaders, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Payments service (#58).
 *
 * Stripe Checkout ledger on the isolated `pwn4g3-secure` D1 (separate from
 * the main app DB — payment rows never mingle with telemetry/bookings).
 * Stripe is the source of truth for money; D1 is the queryable ledger.
 *
 * Prices are server-side constants per package — the client never sends an
 * amount, so totals can't be tampered with. Secrets fail closed (503).
 *
 *   POST /api/payments/checkout { package, email, name?, bookingId? }
 *     -> 201 { id (order), url (stripe checkout) }
 *   POST /api/payments/webhook (Stripe-signed, raw body)
 *     -> 200 { received }
 *   GET  /api/payments?id=<uuid> -> order + latest txn status
 */

interface Env {
	DB: D1Database;
	STRIPE_SECRET_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;
	STRIPE_PUBLISHABLE_KEY?: string;
	SITE_URL?: string;
}

const METHODS = 'GET, OPTIONS, POST';
const MAX_BODY_BYTES = 16 * 1024;

const PACKAGES: Record<string, { amount: number; label: string }> = {
	audit: { amount: 35_000, label: 'Website audit' },
	redesign: { amount: 90_000, label: 'Site redesign' },
	launch: { amount: 120_000, label: 'Launch package' },
	booking: { amount: 180_000, label: 'Booking system' },
	storefront: { amount: 240_000, label: 'Online store' },
	build: { amount: 280_000, label: 'Build package' },
	scale: { amount: 500_000, label: 'Scale package' }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ok = (data: unknown, status = 200, request?: Request): Response =>
	new Response(JSON.stringify({ ok: true, data }), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS, request) }
	});

const fail = (error: string, status = 400, request?: Request): Response =>
	new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS, request) }
	});

const nowSec = (): number => Math.floor(Date.now() / 1000);

/** Verify a Stripe webhook signature (tolerance 5 min). */
async function verifyStripeWebhook(raw: string, header: string | null, secret: string): Promise<boolean> {
	if (!header) return false;
	const parts: Record<string, string> = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
	const t = Number(parts.t);
	if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > 300) return false;
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.t}.${raw}`));
	const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
	const candidates = Array.isArray(parts.v1) ? parts.v1 : [parts.v1].filter(Boolean);
	return candidates.some((sig) => typeof sig === 'string' && sig.length === hex.length && sig.split('').reduce((a, c, i) => a | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

async function stripeApi(secret: string, path: string, params: Record<string, string>): Promise<{ status: number; body: unknown }> {
	const res = await fetch(`https://api.stripe.com${path}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams(params),
		signal: AbortSignal.timeout(15_000)
	});
	return { status: res.status, body: await res.json().catch(() => null) };
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;
		const url = new URL(request.url);

		if (url.pathname === '/api/payments') {
			if (request.method === 'GET') {
				const id = url.searchParams.get('id');
				if (id) {
					const order = await env.DB.prepare('SELECT id, amount, currency, status, description, created_at FROM orders WHERE id = ?')
						.bind(id)
						.first<{ id: string; amount: number; currency: string; status: string; description: string | null; created_at: string }>()
						.catch(() => null);
					if (!order) return fail('unknown_order', 404, request);
					const txn = await env.DB.prepare('SELECT status, updated_at FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
						.bind(id)
						.first<{ status: string; updated_at: string }>()
						.catch(() => null);
					return ok({ ...order, latest_transaction: txn }, 200, request);
				}
				return ok(
					{
						service: 'pwn4g3-payments',
						checkout: 'POST /api/payments/checkout { package: audit|redesign|launch|booking|storefront|build|scale, email, name?, bookingId?, embedded? }',
						statusLookup: 'GET /api/payments?id=<uuid>',
						webhook: 'POST /api/payments/webhook (Stripe-signed)',
						publishableKey: env.STRIPE_PUBLISHABLE_KEY ?? null,
						packages: Object.fromEntries(Object.entries(PACKAGES).map(([k, v]) => [k, { amount: v.amount, currency: 'usd' }])),
						note: 'Internal service, reached via the pwn4g3 gateway.'
					},
					200,
					request
				);
			}

			if (request.method !== 'POST') return fail('method_not_allowed', 405, request);
			return fail('use_checkout_endpoint', 404, request);
		}

		if (url.pathname === '/api/payments/checkout') {
			if (request.method !== 'POST') return fail('method_not_allowed', 405, request);
			// Money route: tight bucket + fail-closed secrets.
			const limited = rateLimitOr429(request, { limit: 10, windowMs: 60_000, prefix: 'pay-checkout' }, 'pay-checkout');
			if (limited) return limited;
			if (!env.STRIPE_SECRET_KEY) return fail('payments_not_configured', 503, request);

			let body: Record<string, unknown>;
			try {
				body = (await request.json()) as Record<string, unknown>;
			} catch {
				return fail('invalid_json', 400, request);
			}
			const pkg = typeof body.package === 'string' ? PACKAGES[body.package] : undefined;
			const email = typeof body.email === 'string' && body.email.length <= 254 && EMAIL_RE.test(body.email) ? body.email : undefined;
			const name = typeof body.name === 'string' && body.name.length <= 120 ? body.name : null;
			const bookingId = typeof body.bookingId === 'string' && body.bookingId.length <= 64 ? body.bookingId : null;
			// Embedded checkout keeps the buyer on-site (Stripe renders inline);
			// default stays a hosted redirect URL.
			const embedded = body.embedded === true;
			if (!pkg || !email) return fail('package_and_valid_email_required', 422, request);

			const site = (env.SITE_URL ?? 'https://pwn4g3.pages.dev').replace(/\/+$/, '');
			try {
				// Upsert customer by email.
				let customer = await env.DB.prepare('SELECT id, stripe_customer_id FROM customer_profiles WHERE email = ?')
					.bind(email)
					.first<{ id: string; stripe_customer_id: string | null }>();
				const now = nowSec();
				if (!customer) {
					const cid = crypto.randomUUID();
					const sc = await stripeApi(env.STRIPE_SECRET_KEY, '/v1/customers', { email, ...(name ? { name } : {}) });
					if (sc.status >= 400) {
						console.error(JSON.stringify({ msg: 'pay_customer_failed', status: sc.status }));
						return fail('payment_provider_error', 502, request);
					}
					const sid = (sc.body as { id?: string })?.id ?? null;
					await env.DB.prepare('INSERT INTO customer_profiles (id, email, name, stripe_customer_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
						.bind(cid, email, name, sid, now, now)
						.run();
					customer = { id: cid, stripe_customer_id: sid };
				}
				// Ledger order, then the real Checkout Session.
				const orderId = crypto.randomUUID();
				await env.DB.prepare("INSERT INTO orders (id, customer_id, booking_id, amount, currency, status, description, created_at, updated_at) VALUES (?, ?, ?, ?, 'usd', 'pending', ?, ?, ?)")
					.bind(orderId, customer.id, bookingId, pkg.amount, pkg.label, now, now)
					.run();
				const cs = await stripeApi(env.STRIPE_SECRET_KEY, '/v1/checkout/sessions', {
					'mode': 'payment',
					'customer': customer.stripe_customer_id ?? '',
					'line_items[0][price_data][currency]': 'usd',
					'line_items[0][price_data][unit_amount]': String(pkg.amount),
					'line_items[0][price_data][product_data][name]': pkg.label,
					'line_items[0][quantity]': '1',
					...(embedded
						? {
								'ui_mode': 'embedded',
								'return_url': `${site}/shop?paid=1&order=${orderId}`
							}
						: {
								'success_url': `${site}/book?paid=1&order=${orderId}`,
								'cancel_url': `${site}/book?cancelled=1&order=${orderId}`
							}),
					'client_reference_id': orderId,
					'customer_email': email
				});
				if (cs.status >= 400) {
					await env.DB.prepare("UPDATE orders SET status = 'failed', updated_at = ? WHERE id = ?").bind(nowSec(), orderId).run();
					console.error(JSON.stringify({ msg: 'pay_session_failed', status: cs.status }));
					return fail('payment_provider_error', 502, request);
				}
				const session = cs.body as { id: string; url?: string; client_secret?: string; payment_intent?: string };
				if (embedded && !session.client_secret) {
					await env.DB.prepare("UPDATE orders SET status = 'failed', updated_at = ? WHERE id = ?").bind(nowSec(), orderId).run();
					console.error(JSON.stringify({ msg: 'pay_session_failed', status: cs.status, reason: 'no_client_secret' }));
					return fail('payment_provider_error', 502, request);
				}
				if (!embedded && !session.url) {
					await env.DB.prepare("UPDATE orders SET status = 'failed', updated_at = ? WHERE id = ?").bind(nowSec(), orderId).run();
					console.error(JSON.stringify({ msg: 'pay_session_failed', status: cs.status, reason: 'no_url' }));
					return fail('payment_provider_error', 502, request);
				}
				await env.DB.prepare("INSERT INTO payment_transactions (id, order_id, stripe_checkout_session_id, stripe_payment_intent_id, amount, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'usd', 'pending', ?, ?)")
					.bind(crypto.randomUUID(), orderId, session.id, session.payment_intent ?? null, pkg.amount, now, now)
					.run();
				console.log(JSON.stringify({ msg: 'pay_checkout', order: orderId, embedded }));
				return ok(embedded ? { id: orderId, clientSecret: session.client_secret } : { id: orderId, url: session.url }, 201, request);
			} catch (e) {
				console.error(JSON.stringify({ msg: 'pay_checkout_failed' }));
				return fail('store_unavailable', 500, request);
			}
		}

		if (url.pathname === '/api/payments/webhook') {
			if (request.method !== 'POST') return fail('method_not_allowed', 405, request);
			if (!env.STRIPE_WEBHOOK_SECRET) return fail('payments_not_configured', 503, request);
			const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'pay-webhook' }, 'pay-webhook');
			if (limited) return limited;
			const raw = await request.text();
			if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES * 4) return fail('payload_too_large', 413, request);
			const valid = await verifyStripeWebhook(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
			if (!valid) return fail('invalid_signature', 403, request);
			let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
			try {
				event = JSON.parse(raw) as typeof event;
			} catch {
				return fail('invalid_json', 400, request);
			}
			if (!event.id || !event.type) return fail('invalid_event', 422, request);
			try {
				const dupe = await env.DB.prepare('SELECT id FROM payment_webhooks WHERE stripe_event_id = ?').bind(event.id).first<{ id: string }>();
				if (dupe) return ok({ received: true, deduped: true });
				await env.DB.prepare('INSERT INTO payment_webhooks (id, stripe_event_id, event_type, payload) VALUES (?, ?, ?, ?)')
					.bind(crypto.randomUUID(), event.id, event.type, raw.slice(0, 8000))
					.run();
				const obj = event.data?.object ?? {};
				const sessionId = (obj.id as string) ?? null;
				const clientRef = (obj.client_reference_id as string) ?? null;
				const intentId = (obj.payment_intent as string) ?? null;
				const now = nowSec();
				if (event.type === 'checkout.session.completed' && clientRef) {
					await env.DB.prepare("UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ?").bind(now, clientRef).run();
					await env.DB.prepare("UPDATE payment_transactions SET status = 'succeeded', stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, ?), updated_at = ? WHERE stripe_checkout_session_id = ?")
						.bind(intentId, now, sessionId)
						.run();
				} else if (event.type === 'payment_intent.payment_failed' && intentId) {
					const pi = obj as { last_payment_error?: { code?: string; message?: string } };
					await env.DB.prepare('UPDATE payment_transactions SET status = ?, failure_code = ?, failure_message = ?, updated_at = ? WHERE stripe_payment_intent_id = ?')
						.bind('failed', pi.last_payment_error?.code ?? null, pi.last_payment_error?.message?.slice(0, 300) ?? null, now, intentId)
						.run();
				}
				console.log(JSON.stringify({ msg: 'pay_webhook', type: event.type }));
				return ok({ received: true });
			} catch {
				console.error(JSON.stringify({ msg: 'pay_webhook_store_failed' }));
				return fail('store_unavailable', 500, request);
			}
		}

		if (url.pathname === '/') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405, request);
			return ok(
				{
					service: 'pwn4g3-payments',
					endpoints: { checkout: 'POST /api/payments/checkout', webhook: 'POST /api/payments/webhook', status: 'GET /api/payments?id=<uuid>' },
					note: 'Internal service, reached via the pwn4g3 gateway.'
				},
				200,
				request
			);
		}

		return fail('not_found', 404, request);
	}
};
