import { corsHeaders, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';

/**
 * Admin console (#43).
 *
 * Single self-contained page (no build step): broadcast compose, ledger
 * view, channel status. Private by token-gating, not by obscurity — every
 * /admin/api/* route verifies the bearer against ADMIN_TOKEN (same value as
 * the notify worker) with a constant-time compare and fails closed (503)
 * when the secret is missing.
 *
 * The console never holds delivery secrets: compose forwards the operator's
 * own Authorization header to the NOTIFY_SERVICE binding, channel status
 * comes from notify's public info endpoint, and the ledger reads D1
 * directly. Reachable at /admin/* via the gateway.
 */

interface Env {
	DB: D1Database;
	ADMIN_TOKEN?: string;
	NOTIFY_SERVICE: { fetch(request: Request): Promise<Response> };
}

const METHODS = 'GET, OPTIONS, POST';
const MAX_BODY_BYTES = 16 * 1024;

const json = (data: unknown, status = 200): Response =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS) }
	});

const ok = (data: unknown, status = 200): Response => json({ ok: true, data }, status);
const fail = (error: string, status = 400): Response => json({ ok: false, error }, status);

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

/** Fail-closed gate: 503 when unconfigured, 401/403 on bad credentials. */
const gate = async (request: Request, env: Env): Promise<Response | null> => {
	if (!env.ADMIN_TOKEN) return fail('admin_not_configured', 503);
	const token = bearerToken(request);
	if (!token) return fail('admin_token_required', 401);
	if (!(await verifyAdminToken(token, env.ADMIN_TOKEN))) return fail('admin_token_invalid', 403);
	return null;
};

const PAGE = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'<meta name="robots" content="noindex, nofollow">\n' +
'<title>pwn4g3 admin</title>\n' +
'<style>\n' +
':root { color-scheme: dark; }\n' +
'body { background: #0a0a0b; color: #e8e8e6; font: 14px/1.5 ui-monospace, monospace; margin: 0; padding: 24px; }\n' +
'main { max-width: 760px; margin: 0 auto; }\n' +
'h1 { font-size: 20px; border-bottom: 3px solid #c8ff00; padding-bottom: 8px; }\n' +
'section { border: 1px solid #333; padding: 16px; margin: 16px 0; }\n' +
'h2 { font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px; }\n' +
'input[type=text], input[type=password], textarea { width: 100%; box-sizing: border-box; background: #111; color: inherit; border: 1px solid #444; padding: 8px; font: inherit; margin: 4px 0 12px; }\n' +
'textarea { min-height: 88px; resize: vertical; }\n' +
'button { background: #c8ff00; color: #000; border: 0; font: inherit; font-weight: 700; padding: 8px 16px; cursor: pointer; }\n' +
'button:active { transform: translateY(1px); }\n' +
'label.chk { margin-right: 16px; }\n' +
'table { width: 100%; border-collapse: collapse; font-size: 12px; }\n' +
'th, td { text-align: left; border-bottom: 1px solid #222; padding: 6px 8px; vertical-align: top; }\n' +
'.pill { display: inline-block; padding: 0 8px; border: 1px solid #666; }\n' +
'.delivered, .sent { color: #c8ff00; border-color: #c8ff00; }\n' +
'.failed { color: #ff5f5f; border-color: #ff5f5f; }\n' +
'.partial, .skipped, .queued { color: #ffb020; border-color: #ffb020; }\n' +
'pre { background: #111; padding: 12px; overflow-x: auto; font-size: 12px; }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<main>\n' +
'<h1>pwn4g3 // admin</h1>\n' +
'<section>\n' +
'<h2>1 · token</h2>\n' +
'<input id="token" type="password" placeholder="ADMIN_TOKEN" autocomplete="off">\n' +
'<button id="save">unlock</button> <span id="authstate"></span>\n' +
'</section>\n' +
'<section>\n' +
'<h2>2 · broadcast</h2>\n' +
'<textarea id="message" maxlength="2000" placeholder="message (max 2000 chars)"></textarea>\n' +
'<input id="url" type="text" placeholder="https:// link (optional)">\n' +
'<div>\n' +
'<label class="chk"><input type="checkbox" class="ch" value="discord" checked> discord</label>\n' +
'<label class="chk"><input type="checkbox" class="ch" value="reddit"> reddit</label>\n' +
'<label class="chk"><input type="checkbox" class="ch" value="signal"> signal</label>\n' +
'</div>\n' +
'<p><button id="send">broadcast</button></p>\n' +
'<pre id="sendout">—</pre>\n' +
'</section>\n' +
'<section>\n' +
'<h2>3 · channel status</h2>\n' +
'<p><button id="status">refresh status</button></p>\n' +
'<pre id="statusout">—</pre>\n' +
'</section>\n' +
'<section>\n' +
'<h2>4 · ledger</h2>\n' +
'<p><button id="ledger">refresh ledger</button></p>\n' +
'<div id="ledgerout">—</div>\n' +
'</section>\n' +
'</main>\n' +
'<script>\n' +
'var tok = sessionStorage.getItem("pwn4g3_admin") || "";' +
'var $ = function (id) { return document.getElementById(id); };' +
'function syncTok() { $("token").value = tok; $("authstate").textContent = tok ? "unlocked (this tab only)" : "locked"; }' +
'function auth() { return tok ? { "Authorization": "Bearer " + tok } : {}; }' +
'function show(el, v) { $(el).textContent = typeof v === "string" ? v : JSON.stringify(v, null, 2); }' +
'$("save").onclick = function () { tok = $("token").value.trim(); sessionStorage.setItem("pwn4g3_admin", tok); syncTok(); };' +
'$("send").onclick = function () {' +
'  var ch = Array.prototype.filter.call(document.querySelectorAll(".ch"), function (c) { return c.checked; }).map(function (c) { return c.value; });' +
'  fetch("./api/broadcast", { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, auth()),' +
'    body: JSON.stringify({ message: $("message").value, url: $("url").value || undefined, channels: ch }) })' +
'    .then(function (r) { return r.json(); }).then(function (j) { show("sendout", j); refreshLedger(); })' +
'    .catch(function (e) { show("sendout", String(e)); });' +
'};' +
'$("status").onclick = function () {' +
'  fetch("./api/status", { headers: auth() }).then(function (r) { return r.json(); })' +
'    .then(function (j) { show("statusout", j); }).catch(function (e) { show("statusout", String(e)); });' +
'};' +
'function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }' +
'function refreshLedger() {' +
'  fetch("./api/ledger?limit=20", { headers: auth() }).then(function (r) { return r.json(); }).then(function (j) {' +
'    if (!j.ok) { show("ledgerout", j); return; }' +
'    var h = "<table><tr><th>time</th><th>message</th><th>status</th><th>deliveries</th></tr>";' +
'    j.data.notifications.forEach(function (n) {' +
'      var d = n.deliveries.map(function (x) { return "<span class=pill>" + esc(x.channel) + " " + esc(x.status) + (x.error ? " (" + esc(x.error) + ")" : "") + "</span>"; }).join(" ");' +
'      h += "<tr><td>" + esc(new Date(n.created_at).toISOString().slice(0, 16).replace("T", " ")) + "</td><td>" + esc(n.message) + (n.url ? "<br>" + esc(n.url) : "") + "</td><td><span class=pill>" + esc(n.status) + "</span></td><td>" + d + "</td></tr>";' +
'    });' +
'    $("ledgerout").innerHTML = h + "</table>";' +
'  }).catch(function (e) { show("ledgerout", String(e)); });' +
'}' +
'$("ledger").onclick = refreshLedger;' +
'syncTok();' +
'</script>\n' +
'</body>\n' +
'</html>\n';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const preflight = handleOptions(request, METHODS);
		if (preflight) return preflight;

		const url = new URL(request.url);
		const path = url.pathname;

		if (path === '/admin' || path === '/admin/') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405);
			return new Response(PAGE, {
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					'Cache-Control': 'no-store',
					'X-Robots-Tag': 'noindex, nofollow'
				}
			});
		}

		if (path === '/admin/api/status') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405);
			const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'admin-status' }, 'admin-status');
			if (limited) return limited;
			const denied = await gate(request, env);
			if (denied) return denied;

			// Channel truth comes from notify's public info endpoint — the
			// console never touches delivery secrets.
			let channels: Record<string, string> = { discord: 'unknown', reddit: 'unknown', signal: 'unknown' };
			try {
				const info = await env.NOTIFY_SERVICE.fetch(new Request('https://internal/api/notify'));
				const body = (await info.json()) as { ok: boolean; data?: { channels?: Record<string, string> } };
				if (body.ok && body.data?.channels) channels = body.data.channels;
			} catch {
				console.error(JSON.stringify({ msg: 'admin_notify_info_failed' }));
			}
			const counts = await env.DB.prepare(
				"SELECT status, COUNT(*) AS n FROM notifications GROUP BY status"
			).all<{ status: string; n: number }>().then(
				(r) => r.results ?? [],
				() => null
			);
			if (counts === null) {
				console.error(JSON.stringify({ msg: 'admin_status_store_failed' }));
				return fail('store_unavailable', 500);
			}
			return ok({ channels, totals: counts });
		}

		if (path === '/admin/api/ledger') {
			if (request.method !== 'GET') return fail('method_not_allowed', 405);
			const limited = rateLimitOr429(request, { limit: 60, windowMs: 60_000, prefix: 'admin-ledger' }, 'admin-ledger');
			if (limited) return limited;
			const denied = await gate(request, env);
			if (denied) return denied;

			const rawLimit = Number(url.searchParams.get('limit') ?? '20');
			const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, Math.floor(rawLimit))) : 20;
			let rows: { id: string; message: string; url: string | null; channels: string; status: string; created_at: number }[];
			let deliveries: { notification_id: string; channel: string; status: string; attempts: number; error: string | null }[] = [];
			try {
				const notes = await env.DB.prepare(
					'SELECT id, message, url, channels, status, created_at FROM notifications ORDER BY created_at DESC LIMIT ?'
				)
					.bind(limit)
					.all<{ id: string; message: string; url: string | null; channels: string; status: string; created_at: number }>();
				rows = notes.results ?? [];
				const ids = rows.map((r) => r.id);
				if (ids.length > 0) {
					const placeholders = ids.map(() => '?').join(',');
					const d = await env.DB.prepare(
						`SELECT notification_id, channel, status, attempts, error FROM notify_deliveries WHERE notification_id IN (${placeholders}) ORDER BY channel`
					)
						.bind(...ids)
						.all<{ notification_id: string; channel: string; status: string; attempts: number; error: string | null }>();
					deliveries = d.results ?? [];
				}
			} catch {
				console.error(JSON.stringify({ msg: 'admin_ledger_store_failed' }));
				return fail('store_unavailable', 500);
			}
			return ok({
				notifications: rows.map((r) => ({
					...r,
					channels: JSON.parse(r.channels) as string[],
					deliveries: deliveries.filter((d) => d.notification_id === r.id)
				}))
			});
		}

		if (path === '/admin/api/broadcast') {
			if (request.method !== 'POST') return fail('method_not_allowed', 405);
			const denied = await gate(request, env);
			if (denied) return denied;
			const limited = rateLimitOr429(request, { limit: 10, windowMs: 60_000, prefix: 'admin-broadcast' }, 'admin-broadcast');
			if (limited) return limited;

			const declared = request.headers.get('content-length');
			if (declared && Number(declared) > MAX_BODY_BYTES) return fail('payload_too_large', 413);
			const raw = await request.text();
			if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return fail('payload_too_large', 413);

			// Forward the operator's own bearer — the console adds no identity
			// of its own, so notify's auth + validation stay authoritative.
			let upstream: Response;
			try {
				upstream = await env.NOTIFY_SERVICE.fetch(
					new Request('https://internal/api/notify', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken(request) ?? ''}` },
						body: raw
					})
				);
			} catch {
				console.error(JSON.stringify({ msg: 'admin_notify_unreachable' }));
				return fail('notify_unavailable', 502);
			}
			const text = await upstream.text();
			console.log(JSON.stringify({ msg: 'admin_broadcast', upstream: upstream.status }));
			return new Response(text, {
				status: upstream.status,
				headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(METHODS) }
			});
		}

		return fail('not_found', 404);
	}
};
