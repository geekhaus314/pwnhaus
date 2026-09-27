<script lang="ts">
	// #37: labs index. Every card links something live today — analyzer,
	// concierge, shop, status, stats, guestbook, escape room. The apps/*
	// microfrontend stubs park here only once they deploy; no dead links.

	interface Lab {
		href: string;
		code: string;
		name: string;
		tagline: string;
		proof: string;
		external?: boolean;
	}

	const labs: Lab[] = [
		{ href: '/lab', code: 'VIPER', name: 'Solidity analyzer', tagline: 'Paste a contract, watch a real edge worker audit it.', proof: '22 checks · live POST' },
		{ href: '/ask', code: 'ASK', name: 'Site concierge', tagline: 'Source-cited answers from this site\u2019s corpus.', proof: 'FTS + AI · cached' },
		{ href: '/shop', code: 'SHOP', name: 'Fixed-price checkout', tagline: 'Real Stripe checkout for audits, redesigns, builds.', proof: 'embedded + hosted' },
		{ href: '/status', code: 'STATUS', name: 'Live health', tagline: 'Browser-probed edge health, 60s refresh.', proof: '6 probes · live' },
		{ href: '/stats', code: 'STATS', name: 'Live numbers', tagline: 'Gateway inventory + latency charts, hand-rolled SVG.', proof: 'no fake graphs' },
		{ href: '/guestbook', code: 'GUEST', name: 'Guestbook', tagline: 'Moderated sign-and-list on D1.', proof: 'spam-proofed' },
		{
			href: 'https://pwn4g3.geekhaus314.workers.dev/hive/status',
			code: 'HIVE',
			name: 'Hivemind escape room',
			tagline: 'Cipher chain running on the gateway.',
			proof: 'live API',
			external: true
		}
	];
</script>

<svelte:head>
	<title>Labs — try the infrastructure — pwn4g3</title>
	<meta
		name="description"
		content="Every pwn4g3 lab is live infrastructure, not a screenshot: Solidity analyzer, AI concierge, Stripe shop, health probes, stats, guestbook, escape room."
	/>
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Labs</p>
	<h1>The portfolio <em>is the demo</em></h1>
	<p class="lede">
		No mockups below — each card runs on the same edge fleet your project
		would ship on. Break things; the probes on <a href="/status">/status</a> will notice.
	</p>
</section>

<section class="section">
	<div class="package-grid">
		{#each labs as lab}
			<a
				class="pkg reveal"
				href={lab.href}
				target={lab.external ? '_blank' : undefined}
				rel={lab.external ? 'noopener noreferrer' : undefined}
			>
				<span class="pkg-code">{lab.code}</span>
				<h2>{lab.name}</h2>
				<p class="pkg-best">{lab.tagline}</p>
				<span class="pkg-proof">● {lab.proof}</span>
			</a>
		{/each}
	</div>
	<p class="hint">
		Framework stubs in <code>apps/*</code> (Next, Nuxt, Go, Ruby, Rust) mount here
		once they deploy as gateway-backed microfrontends.
	</p>
</section>

<style>
	.package-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}
	.pkg {
		background: var(--surface, #080a0d);
		border: 1px solid rgba(236, 231, 224, 0.08);
		border-radius: 12px;
		padding: 2rem 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		transition: border-color 0.2s, transform 0.2s;
		text-decoration: none;
	}
	.pkg:hover { border-color: rgba(165, 29, 55, 0.5); transform: translateY(-2px); }
	.pkg-code {
		font: 0.7rem var(--font-mono, monospace);
		color: var(--accent-bright, #e33d5c);
		letter-spacing: 0.15em;
	}
	.pkg h2 {
		font-family: var(--font-heading, 'Cormorant Garamond'), serif;
		font-size: 1.8rem;
		font-weight: 500;
		margin: 0;
	}
	.pkg-best { color: var(--muted, #898681); font-size: 0.85rem; line-height: 1.6; margin: 0; }
	.pkg-proof { font: 0.68rem var(--font-mono, monospace); color: var(--ok, #35d07f); }
	.hint {
		margin-top: 1.5rem;
		font: 500 0.68rem var(--font-mono, monospace);
		color: var(--muted, #898681);
	}
	.hint code { color: var(--ink, #ece7e0); }
</style>
