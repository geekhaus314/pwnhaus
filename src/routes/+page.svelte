<script lang="ts">
	import Terminal from '$lib/components/Terminal.svelte';
	import HeroCanvas from '$lib/components/HeroCanvas.svelte';
	import Signal from '$lib/components/Signal.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import ProjectModal from '$lib/components/ProjectModal.svelte';
	import GitHubStats from '$lib/components/GitHubStats.svelte';
	import BookingForm from '$lib/components/BookingForm.svelte';

	import { projects, projectFilters, type ProjectFilter } from '$lib/data/projects';
	import { profile, capabilities, stack } from '$lib/data/profile';
	import type { Project } from '$lib/data/projects';

	let activeProject = $state<Project | null>(null);
	let activeFilter = $state<ProjectFilter>('All');

	const filtered = $derived(
		activeFilter === 'All'
			? projects
			: projects.filter((p) => p.type === activeFilter)
	);
</script>

<svelte:head>
	<title>pwn4g3 — Software + Security Engineering</title>
	<meta name="description" content="pwn4g3 — full-stack development and security engineering by Jake Viefhaus. Web applications, APIs, automation, AI systems, infrastructure." />
</svelte:head>

<!-- ═══════════════════════════════════════════════════════
     HERO CANVAS BANNER
════════════════════════════════════════════════════════ -->
<HeroCanvas />

<!-- ═══════════════════════════════════════════════════════
     HERO
════════════════════════════════════════════════════════ -->
<section id="top" class="hero">
	<div class="hero-copy">
		<p class="eyebrow">
			<i aria-hidden="true"></i>
			Full-Stack Developer · St. Louis, MO
		</p>

		<div class="mono-tag">
			<span class="accent">[whoami]$</span> Jake Viefhaus (aka
			<a href={profile.github} target="_blank" rel="noopener noreferrer">@geekhaus314</a>
			on GitHub)
		</div>

		<h1>pwn<em>4g3</em></h1>

		<p class="hero-lede">{profile.summary}</p>

		<div class="hero-actions">
			<a href="#booking" class="button primary">Book a project <span>→</span></a>
			<a href="#portfolio" class="button ghost">See my work <span>→</span></a>
			<a href={profile.github} target="_blank" rel="noopener noreferrer" class="button ghost">
				GitHub <span>↗</span>
			</a>
		</div>

		<div class="hero-meta">
			<span>St. Louis, MO</span>
			<span>Full-Stack · Security</span>
			<span>Open to work</span>
		</div>
	</div>

	<div class="hero-visual">
		<Terminal />
		<span class="hero-code" aria-hidden="true">0x</span>
		<div class="orbit orbit-a" aria-hidden="true"></div>
		<div class="orbit orbit-b" aria-hidden="true"></div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     ABOUT
════════════════════════════════════════════════════════ -->
<section id="about" class="section" aria-label="About">
	<div class="section-heading">
		<div>
			<span class="section-kicker">001 / About</span>
			<h2>Who I <em>am</em></h2>
		</div>
		<div class="hero-photo-wrap">
			<img src={profile.heroPhoto} alt="Jake Viefhaus" loading="lazy" />
		</div>
	</div>

	<div class="about-body">
		<div class="about-copy reveal">
			{#each profile.about as para, i}
				<p class:italic={i === 2}>{para}</p>
			{/each}

			<ul class="about-facts">
				{#each profile.facts as fact}
					<li><strong>{fact.label}:</strong> {fact.value}</li>
				{/each}
			</ul>
		</div>

		<aside class="about-aside reveal">
			<GitHubStats />

			<!-- Instagram embed -->
			<div class="instagram-wrap" aria-label="Instagram profile">
				<blockquote
					class="instagram-media"
					data-instgrm-permalink="https://www.instagram.com/pwn4g3.io/?utm_source=ig_embed&utm_campaign=loading"
					data-instgrm-version="14"
					style="background:#FFF;border:0;border-radius:3px;box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15);max-width:540px;width:99.375%"
				></blockquote>
				<!-- Load embed script only on client -->
				<svelte:element this={'script'} async src="//www.instagram.com/embed.js"></svelte:element>
			</div>
		</aside>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     PORTFOLIO
════════════════════════════════════════════════════════ -->
<section id="portfolio" class="section" aria-label="Portfolio">
	<div class="section-heading reveal">
		<div>
			<span class="section-kicker">002 / Portfolio</span>
			<h2>Selected <em>work</em></h2>
		</div>
		<p>Click any card to see the full breakdown and screenshots.</p>
	</div>

	<div class="filters reveal" role="group" aria-label="Filter projects">
		{#each projectFilters as filter}
			<button
				class:active={activeFilter === filter}
				onclick={() => (activeFilter = filter)}
				aria-pressed={activeFilter === filter}
			>{filter}</button>
		{/each}
	</div>

	<div class="project-grid">
		{#each filtered as project (project.id)}
			<div class="reveal">
				<ProjectCard {project} onopen={(p) => (activeProject = p)} />
			</div>
		{/each}
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     CAPABILITIES
════════════════════════════════════════════════════════ -->
<section class="section capabilities" aria-label="Capabilities">
	<div class="section-heading reveal">
		<div>
			<span class="section-kicker">003 / Capabilities</span>
			<h2>What I <em>build</em></h2>
		</div>
	</div>

	<div class="cap-grid">
		{#each capabilities as cap}
			<div class="cap reveal">
				<span>{cap.index}</span>
				<h3>{cap.title}</h3>
				<p>{cap.description}</p>
			</div>
		{/each}
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     STACK
════════════════════════════════════════════════════════ -->
<section class="section" aria-label="Tech stack">
	<div class="section-heading reveal">
		<div>
			<span class="section-kicker">004 / Stack</span>
			<h2>Tools &amp; <em>languages</em></h2>
		</div>
	</div>

	<div class="stack-cloud reveal">
		{#each stack as tech}
			<span>{tech}</span>
		{/each}
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     SECURITY PANEL
════════════════════════════════════════════════════════ -->
<section class="section security" aria-label="Security engineering">
	<div class="security-panel">
		<div class="security-copy">
			<span class="section-kicker">005 / Security</span>
			<h2>Breaking <em>things</em> to build better ones</h2>
			<p>Bug bounty programs, smart contract auditing, offensive-security tooling, and application hardening — I work across the full attack surface.</p>
			<ul class="security-list">
				<li>→ Bug bounty reconnaissance &amp; ASM</li>
				<li>→ Smart contract auditing (Viper-Web3)</li>
				<li>→ Web application security testing</li>
				<li>→ Firewall &amp; infrastructure hardening</li>
				<li>→ Automated exploit development tooling</li>
			</ul>
		</div>

		<div class="security-visual" aria-hidden="true">
			<div class="radar">
				<i></i><i></i><i></i><i></i>
				<b>ATTACK<br/>SURFACE<br/>ACTIVE</b>
			</div>
			<div class="scanline"></div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     ARCHITECTURE STATUS
════════════════════════════════════════════════════════ -->
<section class="section architecture" aria-label="System architecture">
	<div class="section-heading reveal">
		<div>
			<span class="section-kicker">006 / Architecture</span>
			<h2>Live <em>infrastructure</em></h2>
		</div>
	</div>

	<div class="architecture-grid">
		<div class="arch-card reveal">
			<span class="section-kicker">Frontend</span>
			<div class="architecture-detail">
				<span>SvelteKit</span>
				<strong>pwnhaus.pages.dev</strong>
				<p>SvelteKit + adapter-cloudflare deployed to Cloudflare Pages. Full SSR/SSG, edge-ready, zero cold starts.</p>
			</div>
		</div>
		<div class="arch-card reveal">
			<span class="section-kicker">Backend</span>
			<div class="architecture-detail">
				<span>Cloudflare Worker</span>
				<strong>site-backend</strong>
				<p>TypeScript Worker exposing /health, /api/components, /api/viper-web3, and /api/viper-web3/analyze.</p>
			</div>
		</div>
		<div class="arch-card reveal architecture-status">
			<Signal />
			<div class="live-status">
				<i class="online" aria-hidden="true"></i>
				<span>WORKER ONLINE</span>
			</div>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     MANIFESTO
════════════════════════════════════════════════════════ -->
<section class="manifesto" aria-label="Manifesto">
	<p class="manifesto-mark" aria-hidden="true">—</p>
	<blockquote>
		I build things that work — in the <em>messy middle</em> where product decisions meet infrastructure and security.
	</blockquote>
	<p>pwn4g3 · Jake Viefhaus · St. Louis, MO</p>
</section>

<!-- ═══════════════════════════════════════════════════════
     CAREER
════════════════════════════════════════════════════════ -->
<section id="career" class="section" aria-label="Career">
	<div class="section-heading reveal">
		<div>
			<span class="section-kicker">007 / Career</span>
			<h2>For <em>recruiters</em></h2>
		</div>
		<p>My goal, my standing, and my resume — for hiring managers and talent teams.</p>
	</div>

	<div class="career-grid">
		<div class="career-card reveal">
			<h3>Career Goal</h3>
			<p>{profile.careerGoal}</p>
		</div>
		<div class="career-card reveal">
			<h3>Resume</h3>
			<p>One page, current, with live links to every project on this site.</p>
			<a
				href={profile.resumeUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="button primary"
			>
				Download resume (PDF) →
			</a>
		</div>
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     BOOKING
════════════════════════════════════════════════════════ -->
<section id="booking" class="section booking-section" aria-label="Book a project">
	<div class="section-heading reveal" style="text-align: center; display: block;">
		<span class="section-kicker">008 / Book</span>
		<h2>Book a <em>project</em></h2>
		<p>Tell me what you need — I'll get back to you within a day.</p>
	</div>
	<div class="reveal">
		<BookingForm />
	</div>
</section>

<!-- ═══════════════════════════════════════════════════════
     PROJECT MODAL
════════════════════════════════════════════════════════ -->
{#if activeProject}
	<ProjectModal
		project={activeProject}
		onclose={() => (activeProject = null)}
	/>
{/if}

<style>
	.mono-tag {
		font: 0.8rem var(--font-mono, monospace);
		color: rgba(236, 231, 224, 0.5);
		margin-bottom: 1rem;
	}
	.mono-tag .accent { color: var(--accent, #a51d37); }
	.mono-tag a { text-decoration: underline; text-decoration-color: rgba(236, 231, 224, 0.3); }
	.mono-tag a:hover { color: var(--accent, #a51d37); }

	/* About layout */
	.about-body {
		display: grid;
		grid-template-columns: 1.2fr 0.8fr;
		gap: 4rem;
		margin-top: 2rem;
	}
	.about-copy p {
		color: rgba(236, 231, 224, 0.7);
		line-height: 1.8;
		margin: 0 0 1rem;
	}
	.about-copy p.italic { font-style: italic; color: rgba(236, 231, 224, 0.45); }
	.about-facts {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0 0;
		display: grid;
		gap: 0.5rem;
	}
	.about-facts li { font-size: 0.85rem; color: rgba(236, 231, 224, 0.6); }
	.about-facts strong { color: rgba(236, 231, 224, 0.8); }

	.hero-photo-wrap {
		border: 1px solid rgba(236, 231, 224, 0.1);
		overflow: hidden;
	}
	.hero-photo-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }

	.instagram-wrap {
		margin-top: 2rem;
		max-width: 540px;
		overflow: hidden;
		border: 1px solid rgba(236, 231, 224, 0.1);
	}

	/* Architecture cards */
	.arch-card {
		min-height: 220px;
		border: 1px solid rgba(236, 231, 224, 0.1);
		background: var(--surface, #080a0d);
		padding: 1.25rem;
	}
	.arch-card:nth-child(2) { transform: translateY(1.5rem) rotate(0.6deg); }
	.arch-card:nth-child(3) { transform: rotate(-1.2deg); }

	/* Career grid */
	.career-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
		margin-top: 2rem;
	}
	.career-card {
		border: 1px solid rgba(236, 231, 224, 0.1);
		background: var(--surface, #080a0d);
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.career-card h3 {
		font-family: var(--font-serif, Georgia, serif);
		font-size: 1.5rem;
		margin: 0;
		color: var(--ink, #ece7e0);
	}
	.career-card p {
		font-size: 0.875rem;
		color: rgba(236, 231, 224, 0.65);
		line-height: 1.7;
		margin: 0;
		flex: 1;
	}
	.career-card .button {
		align-self: flex-start;
		text-decoration: none;
		padding: 0.7rem 1.25rem;
		font: 600 0.72rem var(--font-mono, monospace);
		text-transform: uppercase;
	}
	.career-card .button.primary {
		background: var(--accent, #a51d37);
		border: 1px solid var(--accent, #a51d37);
		color: #fff;
	}
	.career-card .button.primary:hover { opacity: 0.9; }

	.booking-section {
		text-align: center;
	}
	.booking-section .section-heading { margin-bottom: 2.5rem; }
	.booking-section .section-heading p { margin: 0.5rem auto 0; max-width: 480px; }

	@media (max-width: 900px) {
		.about-body { grid-template-columns: 1fr; }
		.hero-photo-wrap { max-height: 320px; }
		.career-grid { grid-template-columns: 1fr; }
	}
</style>
