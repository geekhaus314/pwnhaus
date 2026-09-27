<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { GATEWAY_BASE } from '$lib/config';

	// #27: stats dashboard. No D1 read API exists (telemetry write-only,
	// rollups have no GET route), so every number here is real and local:
	// live gateway inventory (GET / lists its own endpoints), live probe
	// latencies with hand-rolled SVG (no chart lib), build info from env.
	// Zero fabricated traffic. SSR-safe: idle shell prerenders, all
	// network I/O in onMount.

	interface EndpointRow {
		name: string;
		path: string;
		ms: number | null;
		status: number | null;
	}

	let endpoints = $state<EndpointRow[]>([]);
	let gatewayCount = $state<number | null>(null);
	let latencySeries = $state<number[]>([]);
	let checking = $state(true);
	let lastCheck = $state<string | null>(null);
	let timer: ReturnType<typeof setInterval> | null = null;

	const REFRESH_MS = 60_000;

	const avg = $derived(
		latencySeries.length === 0 ? null : Math.round(latencySeries.reduce((a, b) => a + b, 0) / latencySeries.length)
	);
	const max = $derived(latencySeries.length === 0 ? 0 : Math.max(...latencySeries));

	async function timedGet(url: string, timeoutMs = 10_000): Promise<{ ms: number | null; status: number | null }> {
		const started = performance.now();
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), timeoutMs);
		try {
			const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
			return { ms: Math.round(performance.now() - started), status: res.status };
		} catch {
			return { ms: null, status: null };
		} finally {
			clearTimeout(t);
		}
	}

	async function refresh() {
		checking = true;
		try {
			const root = await fetch(`${GATEWAY_BASE}/`, { cache: 'no-store' }).then((r) => r.json().catch(() => null));
			const eps: Record<string, string> = root?.endpoints ?? {};
			gatewayCount = Object.keys(eps).length;
			const rows: EndpointRow[] = [];
			const targets: Array<[string, string]> = [
				['gateway root', `${GATEWAY_BASE}/`],
				['health', `${GATEWAY_BASE}/health`],
				['components', `${GATEWAY_BASE}/api/components`],
				['viper info', `${GATEWAY_BASE}/api/viper-web3`],
				['telemetry info', `${GATEWAY_BASE}/api/telemetry`]
			];
			for (const [name, url] of targets) {
				const { ms, status } = await timedGet(url);
				rows.push({ name, path: url.replace(GATEWAY_BASE, '') || '/', ms, status });
				if (ms !== null && name === 'gateway root') {
					latencySeries = [...latencySeries, ms].slice(-30);
				}
			}
			endpoints = rows;
			lastCheck = new Date().toISOString();
		} catch {
			/* keep last good state */
		} finally {
			checking = false;
		}
	}

	// Hand-rolled SVG sparkline (no lib): 300x64 viewBox, polyline of series.
	const sparkPoints = $derived.by(() => {
		if (latencySeries.length < 2) return '';
		const w = 300;
		const h = 64;
		const peak = Math.max(...latencySeries, 1);
		return latencySeries
			.map((v, i) => {
				const x = (i / (latencySeries.length - 1)) * w;
				const y = h - 6 - (v / peak) * (h - 16);
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	});

	const barRows = $derived(
		endpoints.map((e) => ({
			...e,
			width: e.ms === null ? 0 : max > 0 ? Math.min(100, (e.ms / Math.max(max, 500)) * 100) : 0
		}))
	);

	function fmtTime(iso: string | null): string {
		if (!iso) return '—';
		try {
			return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		} catch {
			return iso;
		}
	}

	onMount(() => {
		refresh();
		timer = setInterval(refresh, REFRESH_MS);
		return () => {
			if (timer) clearInterval(timer);
		};
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});
</script>

<svelte:head>
	<title>Stats — Live portfolio numbers — pwn4g3</title>
	<meta
		name="description"
		content="Real live numbers from the pwn4g3 portfolio: API inventory straight from the gateway, probe latencies charted with hand-rolled SVG. No fabricated analytics."
	/>
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Stats</p>
	<h1>Numbers with <em>receipts</em></h1>
	<p class="lede">
		Everything below is measured in your browser right now or served from the
		build — no fake visitor graphs until a traffic read API exists.
	</p>
</section>

<section class="section stat-cards">
	<div class="stat">
		<span class="stat-label">API endpoints (gateway self-report)</span>
		<strong>{gatewayCount === null ? '…' : gatewayCount}</strong>
	</div>
	<div class="stat">
		<span class="stat-label">Gateway latency (avg, this session)</span>
		<strong>{avg === null ? '…' : `${avg}ms`}</strong>
	</div>
	<div class="stat">
		<span class="stat-label">Probes in series</span>
		<strong>{latencySeries.length}</strong>
	</div>
	<div class="stat">
		<span class="stat-label">Last check</span>
		<strong>{fmtTime(lastCheck)}</strong>
	</div>
</section>

<section class="section">
	<div class="lab-panel">
		<div class="lab-head">
			<span class="lab-dot"></span> GATEWAY LATENCY — THIS SESSION (HAND-ROLLED SVG)
		</div>
		{#if latencySeries.length < 2}
			<p class="lab-empty">{checking ? 'Collecting probes…' : 'Not enough samples yet — check back after a minute.'}</p>
		{:else}
			<svg viewBox="0 0 300 64" role="img" aria-label="Gateway latency sparkline, {latencySeries.length} samples">
				<polyline points={sparkPoints} fill="none" stroke="currentColor" stroke-width="2" />
			</svg>
			<p class="hint">avg {avg}ms · max {max}ms · {latencySeries.length} samples · auto-refresh 60s</p>
		{/if}
	</div>
</section>

<section class="section">
	<div class="lab-panel">
		<div class="lab-head"><span class="lab-dot"></span> ENDPOINT LATENCIES (LIVE)</div>
		{#if endpoints.length === 0}
			<p class="lab-empty">Probing…</p>
		{:else}
			<ul class="bars">
				{#each barRows as row}
					<li>
						<div class="bar-top">
							<b>{row.name}</b>
							<span>{row.status !== null ? `HTTP ${row.status}` : 'no response'}</span>
							<span>{row.ms !== null ? `${row.ms}ms` : '—'}</span>
						</div>
						<div class="bar-track" aria-hidden="true">
							<div class="bar-fill" style="width: {row.width}%"></div>
						</div>
						<code>{row.path}</code>
					</li>
				{/each}
			</ul>
		{/if}
		<p class="hint">
			Traffic history (visitors, bookings/day, telemetry rollups) needs a read API
			over D1 <code>telemetry_events</code>/<code>daily_rollups</code> (Otis backend) —
			these charts show live probes only.
		</p>
	</div>
</section>

<style>
	.stat-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		padding-bottom: 0;
	}
	.stat {
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface, #080a0d);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.stat-label {
		font: 600 0.62rem var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted, #898681);
	}
	.stat strong { font-size: 1.7rem; font-weight: 650; }
	svg {
		width: 100%;
		height: 96px;
		color: var(--accent, #a51d37);
		display: block;
	}
	.bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
	.bars li {
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--line);
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.bar-top { display: flex; gap: 0.9rem; align-items: baseline; font: 0.72rem var(--font-mono, monospace); }
	.bar-top b { color: var(--ink, #ece7e0); }
	.bar-top span { color: var(--muted, #898681); margin-left: auto; }
	.bar-top span + span { margin-left: 0; }
	.bar-track { height: 6px; border-radius: 3px; background: rgba(236, 231, 224, 0.08); overflow: hidden; }
	.bar-fill { height: 100%; background: var(--accent, #a51d37); border-radius: 3px; transition: width 0.4s; }
	.bars code { font: 0.65rem var(--font-mono, monospace); color: var(--muted, #898681); }
	.hint {
		margin: 0.75rem 0 0;
		font: 500 0.65rem var(--font-mono, monospace);
		color: var(--muted, #898681);
	}
	.hint code { color: var(--ink, #ece7e0); }
</style>
