<script lang="ts">
	import ViperConsole from '$lib/components/ViperConsole.svelte';
	import Signal from '$lib/components/Signal.svelte';
	import SystemMap from '$lib/components/SystemMap.svelte';
</script>

<svelte:head>
	<title>Live Lab — pwn4g3</title>
	<meta name="description" content="Test it live: a real Solidity security analyzer running on pwn4g3 edge infrastructure, plus proof of the production backend behind this portfolio." />
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Live Lab</p>
	<h1>Don't take my word — <em>test it</em></h1>
	<p class="lede">
		This analyzer runs on my own edge infrastructure, live. Paste a Solidity
		contract and watch a real worker audit it — the same infrastructure
		your project would run on.
	</p>
</section>

<section class="section lab-section">
	<div class="reveal">
		<ViperConsole />
	</div>
</section>

<section class="section" aria-label="System architecture">
	<div class="rail reveal">
		<span class="rail-num">◈</span>
		<h2>Runs on <em>real infra</em></h2>
		<p class="rail-desc">This portfolio is its own demo — frontend on Pages, services on Workers, data in D1.</p>
	</div>

	<div class="infra-grid">
		<div class="infra-card reveal">
			<span class="section-kicker">Frontend</span>
			<strong>pwn4g3.pages.dev</strong>
			<p>SvelteKit on Cloudflare Pages. SSR/SSG at the edge — the page you're reading was served this way.</p>
		</div>
		<div class="infra-card reveal">
			<span class="section-kicker">Backend</span>
			<strong>pwn4g3.geekhaus314.workers.dev</strong>
			<p>Typed workers behind one gateway: health, booking pipeline, telemetry, security analysis, media CDN.</p>
		</div>
		<div class="infra-card infra-live reveal">
			<Signal />
			<div class="live-status">
				<i class="online" aria-hidden="true"></i>
				<span>WORKER ONLINE</span>
			</div>
		</div>
	</div>
</section>

<section class="section" aria-label="Live service map">
	<div class="rail reveal">
		<span class="rail-num">◈</span>
		<h2>Every wire, <em>live</em></h2>
		<p class="rail-desc">The gateway describes itself — this map draws it and probes what it can from your browser.</p>
	</div>
	<div class="reveal">
		<SystemMap />
	</div>
</section>

<section class="cta">
	<p class="eyebrow"><i aria-hidden="true"></i> Convinced?</p>
	<h2>Put it to <em>work.</em></h2>
	<p>Security-hardened builds, APIs, and infrastructure — fixed scope, 24h response.</p>
	<a class="button primary" href="/book">Book a project <span>→</span></a>
</section>

<style>
	.lab-section { padding-top: 0; }
	.cta { text-align: center; padding: 4rem 5vw 6rem; }
	.cta h2 {
		font-family: var(--font-heading);
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 500;
		margin: 0.75rem 0 1rem;
	}
	.cta em { color: var(--accent); font-style: italic; }
	.cta p { color: var(--muted); }
	.cta .button { display: inline-block; margin-top: 1rem; }
</style>
