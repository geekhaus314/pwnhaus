<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { GATEWAY_BASE } from '$lib/config';

	// #29: live status page. No D1 read API exists yet (telemetry is
	// write-only, scheduler ledger has no GET route), so this probes the
	// real public endpoints client-side and keeps an honest in-session
	// log. Zero fake 90-day history. All network I/O in onMount (SSR-safe);
	// prerender emits the idle shell.

	interface Probe {
		key: string;
		label: string;
		url: string;
		detail: string;
	}

	const PROBES: Probe[] = [
		{ key: 'site', label: 'Portfolio site', url: '/', detail: 'Pages + hydration shell' },
		{ key: 'gateway', label: 'API gateway', url: `${GATEWAY_BASE}/`, detail: 'Route listing + 10 bindings' },
		{ key: 'health', label: 'Health service', url: `${GATEWAY_BASE}/health`, detail: 'Edge signal' },
		{ key: 'components', label: 'Components inventory', url: `${GATEWAY_BASE}/api/components`, detail: 'Design-system ledger' },
		{ key: 'viper', label: 'Viper-Web3 analyzer', url: `${GATEWAY_BASE}/api/viper-web3`, detail: 'Solidity triage (#47)' },
		{ key: 'telemetry', label: 'Telemetry ingest', url: `${GATEWAY_BASE}/api/telemetry`, detail: 'Write-only info probe' }
	];

	type ProbeState = 'checking' | 'online' | 'degraded' | 'offline';

	interface Result {
		key: string;
		state: ProbeState;
		ms: number | null;
		status: number | null;
		checkedAt: string;
	}

	interface LogEntry {
		at: string;
		overall: string;
		online: number;
		total: number;
	}

	let results = $state<Record<string, Result>>({});
	let log = $state<LogEntry[]>([]);
	let refreshing = $state(false);
	let timer: ReturnType<typeof setInterval> | null = null;

	const REFRESH_MS = 60_000;
	const TIMEOUT_MS = 10_000;

	const overall = $derived.by(() => {
		const vals = PROBES.map((p) => results[p.key]?.state ?? 'checking');
		if (vals.some((s) => s === 'checking')) return 'checking';
		if (vals.some((s) => s === 'offline')) return 'partial outage';
		if (vals.some((s) => s === 'degraded')) return 'degraded';
		return 'operational';
	});

	const overallClass = $derived(
		overall === 'operational' ? 'ok' : overall === 'degraded' ? 'warn' : overall === 'partial outage' ? 'crit' : 'idle'
	);

	async function probeOne(p: Probe): Promise<Result> {
		const started = performance.now();
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
		try {
			const res = await fetch(p.url, { cache: 'no-store', signal: ctrl.signal });
			const ms = Math.round(performance.now() - started);
			const state: ProbeState = !res.ok ? 'offline' : ms >= 2000 ? 'degraded' : 'online';
			return { key: p.key, state, ms, status: res.status, checkedAt: new Date().toISOString() };
		} catch {
			return { key: p.key, state: 'offline', ms: null, status: null, checkedAt: new Date().toISOString() };
		} finally {
			clearTimeout(t);
		}
	}

	async function checkAll() {
		refreshing = true;
		const settled = await Promise.all(PROBES.map(probeOne));
		const next: Record<string, Result> = {};
		for (const r of settled) next[r.key] = r;
		results = next;
		const online = settled.filter((r) => r.state === 'online').length;
		const states = settled.map((r) => r.state);
		const sum = states.some((s) => s === 'offline')
			? 'partial outage'
			: states.some((s) => s === 'degraded')
				? 'degraded'
				: 'operational';
		log = [{ at: new Date().toISOString(), overall: sum, online, total: settled.length }, ...log].slice(0, 20);
		refreshing = false;
	}

	function fmtTime(iso: string): string {
		try {
			return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		} catch {
			return iso;
		}
	}

	onMount(() => {
		checkAll();
		timer = setInterval(checkAll, REFRESH_MS);
		return () => {
			if (timer) clearInterval(timer);
		};
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});
</script>

<svelte:head>
	<title>Status — Live service health — pwn4g3</title>
	<meta
		name="description"
		content="Live health of the pwn4g3 portfolio: site, API gateway, health, components, Viper-Web3 analyzer, telemetry. Probed from your browser every 60 seconds."
	/>
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Status</p>
	<h1>Live, <em>not a screenshot</em></h1>
	<p class="lede">
		Probed from your browser right now — same edge your hire decision runs on.
		Auto-refreshes every 60 seconds.
	</p>
</section>

<section class="section">
	<div class="status-banner {overallClass}" role="status" aria-live="polite">
		<span class="status-dot" aria-hidden="true"></span>
		<strong>
			{#if overall === 'checking'}CHECKING…
			{:else if overall === 'operational'}ALL SYSTEMS OPERATIONAL
			{:else if overall === 'degraded'}DEGRADED — SLOW RESPONSES
			{:else}PARTIAL OUTAGE
			{/if}
		</strong>
		<button class="button ghost" onclick={checkAll} disabled={refreshing}>
			{refreshing ? 'Probing…' : 'Re-check now'}
		</button>
	</div>

	<div class="probe-grid">
		{#each PROBES as p}
			{@const r = results[p.key]}
			<article class="probe {(r?.state ?? 'checking').toLowerCase()}" aria-label="{p.label} status">
				<div class="probe-top">
					<span class="probe-dot" aria-hidden="true"></span>
					<h2>{p.label}</h2>
				</div>
				<p class="probe-detail">{p.detail}</p>
				<code class="probe-url">{p.url}</code>
				<div class="probe-meta">
					{#if !r || r.state === 'checking'}
						<span>probing…</span>
					{:else}
						<span class="badge">{r.state.toUpperCase()}</span>
						<span>{r.status !== null ? `HTTP ${r.status}` : 'no response'}</span>
						<span>{r.ms !== null ? `${r.ms}ms` : '—'}</span>
						<span>{fmtTime(r.checkedAt)}</span>
					{/if}
				</div>
			</article>
		{/each}
	</div>
</section>

<section class="section">
	<div class="lab-panel">
		<div class="lab-head"><span class="lab-dot"></span> THIS-SESSION CHECK LOG (LAST {log.length})</div>
		{#if log.length === 0}
			<p class="lab-empty">First probe running — results land here with timestamps.</p>
		{:else}
			<ul class="check-log">
				{#each log as entry}
					<li>
						<b>{entry.overall}</b>
						<span>{entry.online}/{entry.total} online</span>
						<span>{fmtTime(entry.at)}</span>
					</li>
				{/each}
			</ul>
		{/if}
		<p class="hint">
			Ledger-backed 90-day history needs a read API over the scheduler's D1
			<code>uptime_checks</code> table (Otis backend) — until then this page shows
			live probes only, no fabricated uptime percentages.
		</p>
	</div>
</section>

<style>
	.status-banner {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.25rem 1.5rem;
		margin-bottom: 1.5rem;
		background: var(--surface, #080a0d);
	}
	.status-banner strong {
		font: 700 0.8rem var(--font-mono, monospace);
		letter-spacing: 0.1em;
		margin-right: auto;
	}
	.status-banner.ok { border-color: rgba(53, 208, 127, 0.5); }
	.status-banner.warn { border-color: rgba(230, 180, 80, 0.6); }
	.status-banner.crit { border-color: rgba(220, 80, 80, 0.65); }
	.status-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #555;
	}
	.ok .status-dot { background: #35d07f; box-shadow: 0 0 14px #35d07f; }
	.warn .status-dot { background: #e6b450; box-shadow: 0 0 14px #e6b450; }
	.crit .status-dot { background: #dc5050; box-shadow: 0 0 14px #dc5050; }
	.probe-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}
	.probe {
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1.25rem 1.25rem 1rem;
		background: var(--surface, #080a0d);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.probe-top { display: flex; align-items: center; gap: 0.6rem; }
	.probe-top h2 { font-size: 1.05rem; margin: 0; font-weight: 600; }
	.probe-dot { width: 8px; height: 8px; border-radius: 50%; background: #555; flex-shrink: 0; }
	.probe.online .probe-dot { background: #35d07f; box-shadow: 0 0 10px #35d07f; }
	.probe.degraded .probe-dot { background: #e6b450; box-shadow: 0 0 10px #e6b450; }
	.probe.offline .probe-dot { background: #dc5050; box-shadow: 0 0 10px #dc5050; }
	.probe-detail { color: var(--muted, #898681); font-size: 0.8rem; margin: 0; }
	.probe-url {
		font: 0.68rem var(--font-mono, monospace);
		color: var(--muted, #898681);
		word-break: break-all;
	}
	.probe-meta {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		font: 0.68rem var(--font-mono, monospace);
		color: var(--muted, #898681);
		margin-top: auto;
		padding-top: 0.5rem;
	}
	.badge { font-weight: 700; letter-spacing: 0.08em; }
	.online .badge { color: #35d07f; }
	.degraded .badge { color: #e6b450; }
	.offline .badge { color: #dc5050; }
	.check-log {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.check-log li {
		display: flex;
		gap: 1rem;
		padding: 0.55rem 0;
		border-bottom: 1px solid var(--line);
		font: 0.72rem var(--font-mono, monospace);
		color: var(--muted, #898681);
	}
	.check-log b { color: var(--ink, #ece7e0); text-transform: uppercase; letter-spacing: 0.06em; }
	.hint {
		margin: 0.75rem 0 0;
		font: 500 0.65rem var(--font-mono, monospace);
		color: var(--muted, #898681);
	}
	.hint code { color: var(--ink, #ece7e0); }
</style>
