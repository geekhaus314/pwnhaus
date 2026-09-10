/**
 * Scheduler worker (#28).
 *
 * Cron-driven ops for the Live Lab: hourly uptime probes, daily GitHub sync
 * + telemetry rollups + retention prune, weekly link scan + R2 integrity audit.
 * Results land in D1 (`uptime_checks`, `github_snapshot`, `daily_rollups`,
 * `telemetry_events`) for the /status (#29) and /stats (#27) pages.
 *
 * Uses 3 of the account's 5 free cron triggers; 2 reserved.
 */

interface Env {
	DB: D1Database;
	ASSETS: R2Bucket;
	GITHUB_REPO?: string;
	PROBE_TARGETS?: string;
}

const DEFAULT_TARGETS = [
	'https://pwn4g3.geekhaus314.workers.dev/',
	'https://pwn4g3.geekhaus314.workers.dev/health',
	'https://pwn4g3.pages.dev/'
];

const FETCH_TIMEOUT_MS = 10_000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const timedFetch = async (url: string, init?: RequestInit): Promise<{ status: number; latencyMs: number }> => {
	const start = Date.now();
	const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
	return { status: res.status, latencyMs: Date.now() - start };
};

const targets = (env: Env): string[] =>
	(env.PROBE_TARGETS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.concat(DEFAULT_TARGETS)
		.slice(0, 8);

const logEvent = async (
	env: Env,
	service: string,
	event: string,
	data: unknown = null
): Promise<void> => {
	const dataJson = data === null ? null : JSON.stringify(data);
	await env.DB.prepare(
		'INSERT INTO telemetry_events (id, service, event, level, ts, data, data_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
	)
		.bind(
			crypto.randomUUID(),
			service,
			event,
			'info',
			null,
			dataJson,
			dataJson ? new TextEncoder().encode(dataJson).length : 0,
			Date.now()
		)
		.run();
};

/** Hourly: probe public endpoints, record one row per target. */
const runProbes = async (env: Env): Promise<void> => {
	for (const target of targets(env)) {
		const id = crypto.randomUUID();
		const checkedAt = Date.now();
		let status = 0;
		let ok = 0;
		let latencyMs = 0;
		try {
			const r = await timedFetch(target);
			status = r.status;
			latencyMs = r.latencyMs;
			ok = status < 400 ? 1 : 0;
		} catch {
			latencyMs = Date.now() - checkedAt;
		}
		await env.DB.prepare(
			'INSERT INTO uptime_checks (id, target, status_code, ok, latency_ms, checked_at) VALUES (?, ?, ?, ?, ?, ?)'
		)
			.bind(id, target, status, ok, latencyMs, checkedAt)
			.run();
		if (!ok) {
			await logEvent(env, 'scheduler', 'uptime.probe_failed', { target, status, latencyMs });
		}
	}
};

/** Daily: sync GitHub repo stats into a single-row snapshot. */
const runGithubSync = async (env: Env): Promise<void> => {
	const repo = env.GITHUB_REPO ?? 'geekhaus314/pwnhaus';
	try {
		const res = await fetch(`https://api.github.com/repos/${repo}`, {
			headers: { 'User-Agent': 'pwn4g3-scheduler', Accept: 'application/vnd.github+json' },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		});
		if (!res.ok) throw new Error(`github api ${res.status}`);
		const j = (await res.json()) as {
			stargazers_count?: number;
			forks_count?: number;
			open_issues_count?: number;
			pushed_at?: string;
		};
		await env.DB.prepare(
			'INSERT INTO github_snapshot (repo, stars, forks, open_issues, pushed_at, synced_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(repo) DO UPDATE SET stars=excluded.stars, forks=excluded.forks, open_issues=excluded.open_issues, pushed_at=excluded.pushed_at, synced_at=excluded.synced_at'
		)
			.bind(
				repo,
				j.stargazers_count ?? 0,
				j.forks_count ?? 0,
				j.open_issues_count ?? 0,
				j.pushed_at ?? null,
				Date.now()
			)
			.run();
	} catch (e) {
		await logEvent(env, 'scheduler', 'github.sync_failed', { repo, error: String(e).slice(0, 200) });
	}
};

/** Daily: roll yesterday (UTC) into daily_rollups, prune tables past 90 days. */
const runRollups = async (env: Env): Promise<void> => {
	const now = new Date();
	const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
	await env.DB.prepare(
		`INSERT INTO daily_rollups (day, service, event, count, first_seen, last_seen)
		 SELECT date(created_at / 1000, 'unixepoch'), service, event, COUNT(*), MIN(created_at), MAX(created_at)
		 FROM telemetry_events WHERE created_at >= ? AND created_at < ?
		 GROUP BY 1, 2, 3
		 ON CONFLICT(day, service, event) DO UPDATE SET count=excluded.count, first_seen=excluded.first_seen, last_seen=excluded.last_seen`
	)
		.bind(yesterdayStart, todayStart)
		.run();
	const cutoff = Date.now() - NINETY_DAYS_MS;
	await env.DB.batch([
		env.DB.prepare('DELETE FROM telemetry_events WHERE created_at < ?').bind(cutoff),
		env.DB.prepare('DELETE FROM uptime_checks WHERE checked_at < ?').bind(cutoff)
	]);
};

/** Weekly: fetch sitemap, check every listed URL (cap 50), log failures. */
const runLinkScan = async (env: Env): Promise<void> => {
	try {
		const res = await fetch('https://pwn4g3.pages.dev/sitemap.xml', {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
		});
		if (!res.ok) throw new Error(`sitemap ${res.status}`);
		const xml = await res.text();
		const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).slice(0, 50);
		let failed = 0;
		for (const u of urls) {
			try {
				const r = await timedFetch(u, { method: 'HEAD' });
				const status = r.status === 405 ? (await timedFetch(u)).status : r.status;
				if (status >= 400) {
					failed++;
					await logEvent(env, 'scheduler', 'link.failed', { url: u, status });
				}
			} catch {
				failed++;
				await logEvent(env, 'scheduler', 'link.failed', { url: u, status: 0 });
			}
		}
		await logEvent(env, 'scheduler', 'link.scan_done', { checked: urls.length, failed });
	} catch (e) {
		await logEvent(env, 'scheduler', 'link.scan_failed', { error: String(e).slice(0, 200) });
	}
};

/** Weekly: list R2 keys, report count + any zero-byte objects (the avif lesson, automated). */
const runR2Audit = async (env: Env): Promise<void> => {
	try {
		const listed = await env.ASSETS.list({ limit: 1000 });
		const empty = listed.objects.filter((o) => o.size === 0).map((o) => o.key).slice(0, 50);
		await logEvent(env, 'scheduler', 'r2.audit_done', {
			objects: listed.objects.length,
			truncated: listed.truncated,
			empty
		});
	} catch (e) {
		await logEvent(env, 'scheduler', 'r2.audit_failed', { error: String(e).slice(0, 200) });
	}
};

export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type'
				}
			});
		}
		const url = new URL(request.url);
		if (url.pathname === '/' && request.method === 'GET') {
			return Response.json({
				ok: true,
				data: {
					service: 'pwn4g3-scheduler',
					crons: { probes: 'hourly', sync_rollups: 'daily', audits: 'weekly Mon' },
					note: 'Internal service. No public routes; driven by cron triggers.'
				}
			});
		}
		return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
	},

	async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
		if (event.cron === '17 * * * *') {
			await runProbes(env);
		} else if (event.cron === '23 5 * * *') {
			await runGithubSync(env);
			await runRollups(env);
		} else if (event.cron === '41 6 * * 1') {
			await runLinkScan(env);
			await runR2Audit(env);
		}
	}
};
