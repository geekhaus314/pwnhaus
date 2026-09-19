import { corsHeaders, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Discord bot worker (#40).
 *
 * Inbound Discord HTTP interactions + self-registration. Outbound broadcast
 * stays in the notify worker (#39) — the `/notify` slash-command forwards to
 * it with the operator's own admin token (verified per-command), so this
 * worker never stores a delivery secret and the ledger stays authoritative.
 *
 * Fail-closed everywhere: no DISCORD_PUBLIC_KEY => 503 on interactions
 * (Discord retries, then disables the endpoint — correct, not a 401 oracle);
 * no ADMIN_TOKEN => 503 on register + /notify command; no bot token/app id
 * => 503 on register. Secrets are set via `wrangler secret put` and never
 * appear in info responses or logs.
 */

interface Env {
	DB: D1Database;
	NOTIFY_SERVICE?: { fetch(request: Request): Promise<Response> };
	ADMIN_TOKEN?: string;
	DISCORD_PUBLIC_KEY?: string;
	DISCORD_APPLICATION_ID?: string;
	DISCORD_BOT_TOKEN?: string;
}

const METHODS = 'GET, OPTIONS, POST';

const ok = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify({ ok: true, data }), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS) }
	});

const fail = (error: string, status = 400): Response =>
	new Response(JSON.stringify({ ok: false, error }), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS) }
	});

/** Discord interaction responses are NOT the {ok,data,error} envelope. */
const discordReply = (content: string, ephemeral = true): Response =>
	new Response(
		JSON.stringify({ type: 4, data: { content: content.slice(0, 1900), flags: ephemeral ? 64 : 0 } }),
		{ status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
	);

const discordPong = (): Response =>
	new Response(JSON.stringify({ type: 1 }), {
		status: 200,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
	});

const verifyAdminToken = async (provided: string, expected: string): Promise<boolean> => {
	const encoder = new TextEncoder();
	const [a, b] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(provided)),
		crypto.subtle.digest('SHA-256', encoder.encode(expected))
	]);
	const x = new Uint8Array(a);
	const y = new Uint8Array(b);
	if (x.length !== y.length) return false;
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
	return diff === 0;
};

const bearerToken = (request: Request): string | null => {
	const header = request.headers.get('authorization');
	if (!header) return null;
	const match = /^Bearer (.+)$/.exec(header.trim());
	return match?.[1]?.trim() ? match[1].trim() : null;
};

const hexToBytes = (hex: string): Uint8Array | null => {
	const clean = hex.trim().toLowerCase();
	if (clean.length === 0 || clean.length % 2 !== 0) return null;
	const out = new Uint8Array(clean.length / 2);
	for (let i = 0; i < out.length; i++) {
		const byte = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
		if (Number.isNaN(byte)) return null;
		out[i] = byte;
	}
	return out;
};

/**
 * Discord signs `timestamp + rawBody` with the app Ed25519 key.
 * SubtleCrypto Ed25519 is used with any-casts so `tsc` stays honest on
 * workers-types versions that don't declare the curve.
 */
const verifyDiscordSignature = async (
	publicKeyHex: string,
	timestamp: string,
	body: string,
	signatureHex: string
): Promise<boolean> => {
	try {
		const subtle = (crypto as unknown as { subtle: any }).subtle;
		const keyBytes = hexToBytes(publicKeyHex);
		const sigBytes = hexToBytes(signatureHex);
		if (!keyBytes || !sigBytes || keyBytes.length !== 32 || sigBytes.length !== 64) return false;
		if (!timestamp || !body) return false;
		const key = await subtle.importKey('raw', keyBytes, { name: 'Ed25519' }, false, ['verify']);
		const msg = new TextEncoder().encode(timestamp + body);
		return (await subtle.verify({ name: 'Ed25519' }, key, sigBytes, msg)) === true;
	} catch {
		return false;
	}
};

interface DiscordOption {
	name: string;
	value?: unknown;
}

interface DiscordInteraction {
	type: number;
	data?: { name?: string; options?: DiscordOption[] };
}

const option = (interaction: DiscordInteraction, name: string): unknown =>
	interaction.data?.options?.find((o) => o.name === name)?.value;

const parseNotifyChannels = (value: unknown): string[] | null => {
	if (value === undefined || value === null || value === '') return ['discord'];
	if (typeof value !== 'string') return null;
	const parts = value
		.split(/[\s,]+/)
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	if (parts.length === 0 || parts.length > 3) return null;
	const allowed = new Set(['discord', 'reddit', 'signal']);
	const seen = new Set<string>();
	for (const p of parts) {
		if (!allowed.has(p) || seen.has(p)) return null;
		seen.add(p);
	}
	return [...seen];
};

const handleStatusCommand = async (env: Env): Promise<Response> => {
	try {
		const hourAgo = Date.now() - 60 * 60 * 1000;
		const row = await env.DB.prepare(
			"SELECT COUNT(*) AS total, SUM(ok) AS healthy, MAX(checked_at) AS last_check FROM uptime_checks WHERE checked_at >= ?"
		)
			.bind(hourAgo)
			.first<{ total: number | null; healthy: number | null; last_check: number | null }>();
		const total = row?.total ?? 0;
		const healthy = row?.healthy ?? 0;
		const when = row?.last_check ? new Date(row.last_check).toISOString() : 'no probes yet';
		return discordReply(`pwn4g3 status: ${healthy}/${total} probes healthy in the last hour (last check ${when}). Details: https://pwn4g3.pages.dev/status`);
	} catch {
		console.error(JSON.stringify({ msg: 'discord_status_store_failed' }));
		return discordReply('Status store unavailable right now — try /status again in a minute.');
	}
};

const handleBookingsCommand = async (env: Env): Promise<Response> => {
	try {
		const rows = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM bookings_log GROUP BY status')
			.all<{ status: string; n: number }>();
		const counts = new Map((rows.results ?? []).map((r) => [r.status, r.n]));
		const queued = counts.get('queued') ?? 0;
		const sent = counts.get('sent') ?? 0;
		const failed = counts.get('failed') ?? 0;
		return discordReply(`Bookings: ${queued} queued, ${sent} sent, ${failed} failed. New requests: https://pwn4g3.pages.dev/#booking`);
	} catch {
		console.error(JSON.stringify({ msg: 'discord_bookings_store_failed' }));
		return discordReply('Bookings ledger unavailable right now — try /bookings again in a minute.');
	}
};

const handleNotifyCommand = async (interaction: DiscordInteraction, env: Env): Promise<Response> => {
	if (!env.ADMIN_TOKEN) return discordReply('Broadcasts are not configured (admin token missing).');
	const provided = option(interaction, 'admin_token');
	if (typeof provided !== 'string' || !provided) return discordReply('Admin token required: /notify message:<text> admin_token:<token>.');
	if (!(await verifyAdminToken(provided, env.ADMIN_TOKEN))) return discordReply('Bad admin token.');

	const message = option(interaction, 'message');
	if (typeof message !== 'string' || message.length === 0 || message.length > 2000) {
		return discordReply('Message required (1–2000 chars): /notify message:<text>.');
	}
	const rawUrl = option(interaction, 'url');
	let url: string | null = null;
	if (rawUrl !== undefined && rawUrl !== null && rawUrl !== '') {
		if (typeof rawUrl !== 'string' || rawUrl.length > 2048 || !rawUrl.startsWith('https://')) {
			return discordReply('URL must be an https:// string (or omit it).');
		}
		url = rawUrl;
	}
	const channels = parseNotifyChannels(option(interaction, 'channels'));
	if (!channels) return discordReply('Channels must be a combination of discord, reddit, signal (or omit for discord).');
	if (!env.NOTIFY_SERVICE) return discordReply('Notify service is not bound — broadcast unavailable.');

	let res: Response;
	try {
		res = await env.NOTIFY_SERVICE.fetch(
			new Request('https://internal/api/notify', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.ADMIN_TOKEN}` },
				body: JSON.stringify({ message, url, channels }),
				signal: AbortSignal.timeout(15_000)
			})
		);
	} catch {
		console.error(JSON.stringify({ msg: 'discord_notify_forward_failed' }));
		return discordReply('Notify service unreachable — broadcast not recorded.');
	}
	if (res.status === 202) {
		try {
			const body = (await res.json()) as { data?: { id?: string; status?: string } };
			const id = body.data?.id ?? 'unknown';
			const status = body.data?.status ?? 'queued';
			return discordReply(`Broadcast ${status} (ledger ${id}).`);
		} catch {
			return discordReply('Broadcast accepted.');
		}
	}
	return discordReply(`Notify rejected the broadcast (HTTP ${res.status}) — nothing sent.`);
};

const COMMAND_DEFS = [
	{ name: 'status', description: 'Live pwn4g3 uptime summary', options: [] },
	{ name: 'bookings', description: 'Queued/sent/failed booking counts', options: [] },
	{
		name: 'notify',
		description: 'Admin broadcast via the notify ledger (needs admin token)',
		options: [
			{ name: 'message', description: 'Broadcast text (1-2000 chars)', type: 3, required: true, max_length: 2000 },
			{ name: 'url', description: 'Optional https:// link', type: 3, required: false },
			{ name: 'channels', description: 'Space/comma list: discord reddit signal (default discord)', type: 3, required: false },
			{ name: 'admin_token', description: 'Admin bearer token (never logged)', type: 3, required: true }
		]
	}
];

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/discord' && request.method === 'GET') {
			const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'discord-info' }, 'discord-info');
			if (limited) return limited;
			return ok({
				service: 'pwn4g3-discord',
				interactions: 'POST /api/discord/interactions (Ed25519-verified)',
				register: 'POST /api/discord/register (admin bearer, self-registers slash commands)',
				commands: ['/status', '/bookings', '/notify'],
				configured: {
					interactions: env.DISCORD_PUBLIC_KEY ? 'live' : 'not_configured',
					registration: env.DISCORD_APPLICATION_ID && env.DISCORD_BOT_TOKEN ? 'live' : 'not_configured',
					notifyForward: env.NOTIFY_SERVICE ? 'bound' : 'unbound'
				},
				limits: { interactionsPerMinPerIp: 60, registerPerMinPerIp: 5 },
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		if (url.pathname === '/api/discord/interactions' && request.method === 'POST') {
			const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'discord-interact' }, 'discord-interact');
			if (limited) return limited;

			if (!env.DISCORD_PUBLIC_KEY) return fail('discord_not_configured', 503);
			const signature = request.headers.get('x-signature-ed25519');
			const timestamp = request.headers.get('x-signature-timestamp');
			if (!signature || !timestamp) return fail('missing_signature', 401);

			const rawBody = await request.text();
			if (rawBody.length > 32 * 1024) return fail('payload_too_large', 413);
			if (!(await verifyDiscordSignature(env.DISCORD_PUBLIC_KEY, timestamp, rawBody, signature))) {
				return fail('bad_signature', 401);
			}

			let interaction: DiscordInteraction;
			try {
				interaction = JSON.parse(rawBody) as DiscordInteraction;
			} catch {
				return fail('invalid_json', 400);
			}

			if (interaction.type === 1) return discordPong();
			if (interaction.type === 2) {
				const name = interaction.data?.name ?? '';
				if (name === 'status') return handleStatusCommand(env);
				if (name === 'bookings') return handleBookingsCommand(env);
				if (name === 'notify') return handleNotifyCommand(interaction, env);
				return discordReply(`Unknown command /${name || '?'} — try /status, /bookings, or /notify.`);
			}
			return discordReply('That interaction type is not supported yet.');
		}

		if (url.pathname === '/api/discord/register' && request.method === 'POST') {
			if (!env.ADMIN_TOKEN) return fail('discord_not_configured', 503);
			const token = bearerToken(request);
			if (!token) return fail('admin_token_required', 401);
			if (!(await verifyAdminToken(token, env.ADMIN_TOKEN))) return fail('admin_token_invalid', 403);

			const limited = rateLimitOr429(request, { limit: 5, windowMs: 60_000, prefix: 'discord-register' }, 'discord-register');
			if (limited) return limited;

			if (!env.DISCORD_APPLICATION_ID || !env.DISCORD_BOT_TOKEN) return fail('discord_not_configured', 503);
			let res: Response;
			try {
				res = await fetch(`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/commands`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json', Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
					body: JSON.stringify(COMMAND_DEFS),
					signal: AbortSignal.timeout(15_000)
				});
			} catch {
				console.error(JSON.stringify({ msg: 'discord_register_unreachable' }));
				return fail('discord_unreachable', 502);
			}
			if (!res.ok) return fail(`discord_rejected_${res.status}`, 502);
			return ok({ registered: COMMAND_DEFS.length, commands: COMMAND_DEFS.map((c) => `/${c.name}`) });
		}

		if (url.pathname === '/' && request.method === 'GET') {
			return ok({
				service: 'pwn4g3-discord',
				endpoints: { info: 'GET /api/discord', interactions: 'POST /api/discord/interactions', register: 'POST /api/discord/register' },
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		if (url.pathname === '/api/discord/interactions' || url.pathname === '/api/discord/register') {
			return fail('method_not_allowed', 405);
		}
		return fail('not_found', 404);
	}
};
