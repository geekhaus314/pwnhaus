<script lang="ts">
	import { profile } from '$lib/data/profile';

	const packages = [
		{
			code: 'LAUNCH',
			name: 'Launch',
			price: '$1,200',
			timing: '1–2 weeks',
			best: 'Local businesses, clinics, photographers, startups needing a credible web presence.',
			features: [
				'Up to 5 custom pages, mobile-first, camera-ready',
				'Booking / contact + email integration',
				'SEO foundations: meta, OG/social share cards, sitemap',
				'Analytics, security headers, favicon & branding',
				'One design revision round, 30 days of post-launch fixes'
			]
		},
		{
			code: 'BUILD',
			name: 'Build',
			price: '$2,800',
			timing: '3–5 weeks',
			featured: true,
			best: 'E-commerce, SaaS MVPs, client portals, dashboards — custom web products that make money.',
			features: [
				'Custom web app: Next.js / SvelteKit / React + TypeScript',
				'Auth, admin panel, and payments (Stripe)',
				'Database, deployment pipeline (CI/CD), custom domain',
				'Booking, catalog, or service flows wired end-to-end',
				'Two revision rounds, 60 days of post-launch support'
			]
		},
		{
			code: 'SCALE',
			name: 'Scale',
			price: '$5,000+',
			timing: 'Ongoing / staggered',
			best: 'Platforms, multi-tenant products, AI/automation systems, and businesses that need an engineering partner.',
			features: [
				'Multi-tenant / white-label platforms (sellable products)',
				'AI agents, workflow automation, integration layers',
				'Security review + hardening (offensive-security background)',
				'Retainer: ongoing features, monitoring, infrastructure',
				'Direct line to an engineer — no account-manager middlemen'
			]
		}
	];

	const addons = [
		{ item: 'Web scraping / data pipelines', price: '$45/hr' },
		{ item: 'Automation / scripting / Zapier-style glue', price: '$45/hr' },
		{ item: 'Firewall & infrastructure hardening', price: '$350 / site' },
		{ item: 'SEO / analytics / schema configuration', price: '$150' },
		{ item: 'Redesign / rebrand (existing site)', price: 'Quote' }
	];
</script>

<svelte:head>
	<title>Services &amp; Pricing — pwn4g3</title>
	<meta name="description" content="Web development, e-commerce, automation, and security engineering for St. Louis businesses — fixed-price packages from $1,200." />
</svelte:head>

<section class="services-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Services &amp; Pricing</p>
	<h1>What I <em>build</em></h1>
	<p class="lede">
		Fixed-price packages. No account managers, no mystery invoices — you work directly with the engineer
		who ships the work. St. Louis, MO · remote-friendly.
	</p>
</section>

<section class="section packages">
	<div class="package-grid">
		{#each packages as pkg}
			<div class="pkg reveal" class:featured={pkg.featured}>
				<span class="pkg-code">{pkg.code}</span>
				<h2>{pkg.name}</h2>
				<div class="pkg-price">
					<strong>{pkg.price}</strong>
					<span>{pkg.timing}</span>
				</div>
				{#if pkg.featured}<span class="pkg-badge">Most purchased</span>{/if}
				<p class="pkg-best">{pkg.best}</p>
				<ul>
					{#each pkg.features as f}
						<li>→ {f}</li>
					{/each}
				</ul>
				<a class="button primary" class:ghost={pkg.featured} href="/#booking">
					Book {pkg.name.toLowerCase()} <span>→</span>
				</a>
			</div>
		{/each}
	</div>
</section>

<section class="section addons">
	<div class="section-heading">
		<span class="section-kicker">ADD-ONS</span>
		<h2>Ala carte <em>work</em></h2>
	</div>
	<div class="addon-list reveal">
		{#each addons as a}
			<div class="addon-row">
				<span>{a.item}</span>
				<div class="addon-rule" aria-hidden="true"></div>
				<strong>{a.price}</strong>
			</div>
		{/each}
	</div>
</section>

<section class="section process">
	<div class="section-heading">
		<span class="section-kicker">PROCESS</span>
		<h2>How it <em>works</em></h2>
	</div>
	<div class="process-grid">
		<div class="step reveal"><b>01</b><h3>Scope</h3><p>Free 20-minute call. I map what you need to this page's packages or quote custom work.</p></div>
		<div class="step reveal"><b>02</b><h3>Contract</h3><p>50% deposit, fixed price, written timeline. What we agree on is what you pay — no creep.</p></div>
		<div class="step reveal"><b>03</b><h3>Build</h3><p>You get a live preview link as I build. Checkpoint reviews, weekly progress, no black box.</p></div>
		<div class="step reveal"><b>04</b><h3>Ship</h3><p>You approve, I deploy to your domain, hand over the code and credentials, and stay on for post-launch fixes.</p></div>
	</div>
</section>

<section class="section faq">
	<div class="section-heading">
		<span class="section-kicker">FAQ</span>
		<h2>Straight <em>answers</em></h2>
	</div>
	<div class="faq-list reveal">
		<p><b>Do you need a local business?</b> No — I work remote, but local St. Louis clients get priority scheduling and optional in-person walkthroughs.</p>
		<p><b>Who owns the code?</b> You do — fully transferred on final payment. You're never locked into me.</p>
		<p><b>What stack do you use?</b> Next.js, SvelteKit, React, TypeScript, Node, Python, Postgres, Redis, Cloudflare/Vercel. Or whatever fits the project best.</p>
		<p><b>Can you fix my existing site instead of rebuilding?</b> Usually yes — performance, SEO, security, and redesign are all ala carte items.</p>
	</div>
</section>

<section class="cta">
	<p class="eyebrow"><i aria-hidden="true"></i> Let's talk</p>
	<h2>Have a project in <em>mind?</em></h2>
	<p>Tell me what you're building — I'll reply within a day with an estimate.</p>
	<a class="button primary" href="/#booking">Book a project <span>→</span></a>
	<a class="button ghost" href="mailto:{profile.email}">or email directly <span>↗</span></a>
</section>

<style>
	.services-hero {
		padding: 9rem 5vw 4rem;
		max-width: 1180px;
		margin: 0 auto;
	}
	.services-hero h1 {
		font-family: var(--font-heading, 'Cormorant Garamond'), serif;
		font-size: clamp(3rem, 7vw, 5rem);
		font-weight: 500;
		line-height: 0.95;
		margin: 1rem 0 1.5rem;
	}
	.services-hero em { color: var(--accent, #a51d37); font-style: italic; }
	.services-hero .lede {
		color: var(--muted, #898681);
		font-size: 1.05rem;
		line-height: 1.7;
		max-width: 34em;
	}

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
		gap: 1rem;
		position: relative;
		transition: border-color 0.2s, transform 0.2s;
	}
	.pkg:hover { border-color: rgba(165, 29, 55, 0.5); transform: translateY(-2px); }
	.pkg.featured {
		border-color: var(--accent, #a51d37);
		background: linear-gradient(160deg, rgba(165, 29, 55, 0.08), var(--surface, #080a0d) 45%);
	}
	.pkg-code {
		font: 0.7rem var(--font-mono, monospace);
		color: var(--accent-bright, #e33d5c);
		letter-spacing: 0.15em;
	}
	.pkg h2 {
		font-family: var(--font-heading, 'Cormorant Garamond'), serif;
		font-size: 2rem;
		font-weight: 500;
		margin: 0;
	}
	.pkg-price { display: flex; align-items: baseline; gap: 0.75rem; }
	.pkg-price strong { font-size: 1.6rem; font-weight: 600; }
	.pkg-price span { font: 0.7rem var(--font-mono, monospace); color: var(--muted, #898681); }
	.pkg-badge {
		position: absolute; top: 1rem; right: 1rem;
		font: 0.6rem var(--font-mono, monospace);
		letter-spacing: 0.1em;
		color: var(--ink, #ece7e0);
		background: var(--accent, #a51d37);
		padding: 0.3rem 0.6rem;
		border-radius: 999px;
	}
	.pkg-best { color: var(--muted, #898681); font-size: 0.85rem; line-height: 1.6; }
	.pkg ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.55rem; }
	.pkg li { color: var(--ink, #ece7e0); font-size: 0.85rem; line-height: 1.5; }
	.pkg .button { margin-top: auto; text-align: center; }

	.addon-list {
		border: 1px solid rgba(236, 231, 224, 0.08);
		border-radius: 12px;
		background: var(--surface, #080a0d);
		padding: 0.5rem 1.75rem;
	}
	.addon-row {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 0.9rem 0;
	}
	.addon-row span { color: var(--ink, #ece7e0); font-size: 0.95rem; }
	.addon-row strong { font-family: var(--font-mono, monospace); font-size: 0.85rem; color: var(--accent-bright, #e33d5c); white-space: nowrap; }
	.addon-rule { flex: 1; border-bottom: 1px dotted rgba(236, 231, 224, 0.15); }

	.process-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.5rem;
	}
	.step {
		background: var(--surface, #080a0d);
		border: 1px solid rgba(236, 231, 224, 0.08);
		border-radius: 12px;
		padding: 1.75rem;
	}
	.step b { font: 0.75rem var(--font-mono, monospace); color: var(--accent, #a51d37); }
	.step h3 { font-family: var(--font-heading, 'Cormorant Garamond'), serif; font-size: 1.4rem; font-weight: 500; margin: 0.5rem 0; }
	.step p { color: var(--muted, #898681); font-size: 0.85rem; line-height: 1.6; margin: 0; }

	.faq-list { display: flex; flex-direction: column; gap: 1rem; max-width: 820px; }
	.faq-list p {
		background: var(--surface, #080a0d);
		border: 1px solid rgba(236, 231, 224, 0.08);
		border-radius: 12px;
		padding: 1.25rem 1.5rem;
		color: var(--muted, #898681);
		font-size: 0.9rem;
		line-height: 1.7;
		margin: 0;
	}
	.faq-list b { color: var(--ink, #ece7e0); }

	.cta { text-align: center; padding: 4rem 5vw 6rem; }
	.cta h2 {
		font-family: var(--font-heading, 'Cormorant Garamond'), serif;
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 500;
		margin: 0.75rem 0 1rem;
	}
	.cta em { color: var(--accent, #a51d37); font-style: italic; }
	.cta p { color: var(--muted, #898681); }
	.cta .button { display: inline-block; margin: 0.5rem 0.35rem; }
</style>