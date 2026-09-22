<script lang="ts">
	import { onMount } from 'svelte';
	import { GATEWAY_BASE } from '$lib/config';

	// Live topology map: hub = gateway, spokes = advertised endpoints.
	// Honest states only — "verified" means this browser got a 200,
	// "advertised" means the gateway lists it but we haven't probed it.
	interface Node {
		key: string;
		label: string;
		route: string;
		state: 'checking' | 'verified' | 'advertised' | 'offline';
	}

	let nodes = $state<Node[]>([]);
	let gatewayState = $state<'checking' | 'verified' | 'offline'>('checking');

	async function probe(url: string): Promise<boolean> {
		try {
			const res = await fetch(url, { cache: 'no-store' });
			return res.ok;
		} catch {
			return false;
		}
	}

	onMount(async () => {
		let endpoints: Record<string, string> = {};
		try {
			const root = await fetch(`${GATEWAY_BASE}/`, { cache: 'no-store' }).then((r) => r.json());
			gatewayState = 'verified';
			endpoints = root.endpoints ?? {};
		} catch {
			gatewayState = 'offline';
			return;
		}
		const keys = Object.keys(endpoints).filter((k) => !['analysis', 'plan'].includes(k));
		nodes = keys.map((k) => ({ key: k, label: k, route: endpoints[k], state: 'advertised' as const }));
		// Verify the cheap, safe GETs; the rest stay honestly "advertised".
		const verifiable: Record<string, string> = {
			health: `${GATEWAY_BASE}/health`,
			components: `${GATEWAY_BASE}/api/components`,
			viper: `${GATEWAY_BASE}/api/viper-web3`,
			telemetry: `${GATEWAY_BASE}/api/telemetry`,
			booking: `${GATEWAY_BASE}/api/booking`,
			notify: `${GATEWAY_BASE}/api/notify`
		};
		await Promise.all(
			nodes.map(async (n) => {
				const url = verifiable[n.key];
				if (!url) return;
				n.state = (await probe(url)) ? 'verified' : 'offline';
			})
		);
		nodes = [...nodes];
	});
</script>

<div class="sysmap" role="status" aria-label="Live infrastructure map">
	<div class="sysmap-hub" class:on={gatewayState === 'verified'} class:off={gatewayState === 'offline'}>
		<i aria-hidden="true"></i>
		<strong>pwn4g3</strong>
		<span>gateway · {gatewayState}</span>
	</div>
	<div class="sysmap-spokes">
		{#each nodes as node}
			<div
				class="sysmap-node"
				class:on={node.state === 'verified'}
				class:off={node.state === 'offline'}
				title={node.route}
			>
				<i aria-hidden="true"></i>
				<strong>{node.label}</strong>
				<span>{node.state}</span>
			</div>
		{/each}
	</div>
	<p class="sysmap-note">verified = this browser got a 200 · advertised = listed by the gateway</p>
</div>

<style>
	.sysmap {
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--card);
		padding: clamp(1.5rem, 3vw, 2.5rem);
		display: grid;
		gap: 1.5rem;
	}
	.sysmap-hub {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		border: 1px solid var(--accent);
		border-radius: var(--radius-sm);
		padding: 1rem 1.25rem;
		background: color-mix(in srgb, var(--accent) 8%, transparent);
		font-family: var(--font-mono);
	}
	.sysmap-hub i, .sysmap-node i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #555;
		flex-shrink: 0;
	}
	.sysmap-hub.on i { background: var(--ok); box-shadow: 0 0 14px var(--ok); animation: pulse-dot 2s ease-in-out infinite; }
	.sysmap-hub.off i { background: var(--crit); }
	.sysmap-hub strong { font-size: 1.1rem; }
	.sysmap-hub span, .sysmap-node span { color: var(--muted); font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; }
	.sysmap-spokes {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.7rem;
	}
	.sysmap-node {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		padding: 0.7rem 0.85rem;
		font-family: var(--font-mono);
	}
	.sysmap-node strong { font-size: 0.8rem; }
	.sysmap-node span { margin-left: auto; }
	.sysmap-node.on { border-color: color-mix(in srgb, var(--ok) 55%, transparent); }
	.sysmap-node.on i { background: var(--ok); box-shadow: 0 0 10px var(--ok); }
	.sysmap-node.off i { background: var(--crit); }
	.sysmap-note { margin: 0; color: var(--muted); font: 500 0.65rem var(--font-mono); }
	@keyframes pulse-dot { 50% { opacity: 0.4; } }
</style>
