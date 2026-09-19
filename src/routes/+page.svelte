<script lang="ts">
	import Terminal from '$lib/components/Terminal.svelte';
	import HeroCanvas from '$lib/components/HeroCanvas.svelte';
	import Signal from '$lib/components/Signal.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import ProjectModal from '$lib/components/ProjectModal.svelte';
	import GitHubStats from '$lib/components/GitHubStats.svelte';
	import BookingForm from '$lib/components/BookingForm.svelte';
	import ViperConsole from '$lib/components/ViperConsole.svelte';

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

	const capTags = ['Frontend', 'Backend', 'AI', 'Security', 'Cloud', 'Redesign'];
</script>

<svelte:head>
	<title>Jake Viefhaus (pwn4g3) — Full-Stack Developer for Hire</title>
	<meta name="description" content="Hire Jake Viefhaus (pwn4g3): full-stack developer in St. Louis shipping production websites, online stores, APIs, and edge infrastructure. Live client work, free quotes, 24h response." />
</svelte:head>

<HeroCanvas />

<!-- ══════════ HERO — the 5-second hire test ══════════ -->
<section id="top" class="hero">
	<div class="hero-copy">
		<p class="status-line"><i aria-hidden="true"></i> Available now — replies in 24h</p>

		<h1>I build websites that <em>win business.</em></h1>

		<p class="hero-who">
			<span class="accent">[whoami]$</span> Jake Viefhaus (pwn4g3) — full-stack developer,
			<a href={profile.github} target="_blank" rel="noopener noreferrer">@geekhaus314</a> on GitHub
		</p>

		<p class="lede">
			Production sites, online stores, and booking systems for local businesses —
			plus the APIs and infrastructure behind them. <strong>Live proof below:</strong>
			everything with a green badge runs somewhere you can click right now.
		</p>

		<div class="hero-actions">
			<a href="#booking" class="button primary big">Get a free quote <span aria-hidden="true">→</span></a>
			<a href="#portfolio" class="button ghost">See live work <span aria-hidden="true">→</span></a>
		</div>

		<ul class="hero-proof" aria-label="Highlights">
			<li><b>3</b> production sites live</li>
			<li><b>20+</b> tech in stack</li>
			<li><b>3.9</b> GPA · CS / Cybersecurity</li>
		</ul>

		<div class="hero-meta">
			<span>St. Louis, MO · Remote OK</span>
			<span>Full-stack · Frontend · Security</span>
		</div>
	</div>

	<div class="hero-visual">
		<Terminal />
	</div>
</section>

<!-- ══════════ TICKER ══════════ -->
<div class="ticker" aria-hidden="true">
	<div class="ticker-track">
		<span>Websites ✦ Online stores ✦ Booking systems ✦ APIs ✦ Automation ✦ Security ✦&nbsp;</span>
		<span>Websites ✦ Online stores ✦ Booking systems ✦ APIs ✦ Automation ✦ Security ✦&nbsp;</span>
	</div>
</div>

<!-- ══════════ TRUST STRIP ══════════ -->
<div class="trust-strip">
	<div class="trust-grid reveal" role="list" aria-label="Track record">
		<div class="trust-cell" role="listitem">
			<span class="trust-num">03<em>.</em></span>
			<span class="trust-label">Production sites live</span>
		</div>
		<div class="trust-cell" role="listitem">
			<span class="trust-num">03<em>.</em></span>
			<span class="trust-label">Client sites shipped</span>
		</div>
		<div class="trust-cell" role="listitem">
			<span class="trust-num">20<em>+</em></span>
			<span class="trust-label">Technologies in stack</span>
		</div>
		<div class="trust-cell" role="listitem">
			<span class="trust-num">24<em>h</em></span>
			<span class="trust-label">Quote turnaround</span>
		</div>
	</div>
</div>

<!-- ══════════ 01 / ABOUT ══════════ -->
<section id="about" class="section" aria-label="About">
	<div class="rail reveal">
		<span class="rail-num">01</span>
		<h2>The dev behind <em>the work</em></h2>
		<p class="rail-desc">One hire covering design, code, deployment, and hardening — no handoffs, no gaps.</p>
	</div>

	<div class="about-grid">
		<div class="about-copy reveal">
			<p>{profile.about[0]}</p>
			<p>{profile.about[1]}</p>
			<ul class="fact-list">
				{#each profile.facts as fact}
					<li><strong>{fact.label}</strong> {fact.value}</li>
				{/each}
			</ul>
		</div>
		<aside class="reveal" aria-label="GitHub activity">
			<GitHubStats />
		</aside>
	</div>
</section>

<!-- ══════════ 02 / PORTFOLIO ══════════ -->
<section id="portfolio" class="section" aria-label="Portfolio">
	<div class="rail reveal">
		<span class="rail-num">02</span>
		<h2>Live work, <em>not mockups</em></h2>
		<p class="rail-desc">
			Green badge = running in production today. Click any card for the full
			breakdown, screenshots, and links.
		</p>
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

<!-- ══════════ 03 / CAPABILITIES ══════════ -->
<section class="section" aria-label="Capabilities">
	<div class="rail reveal">
		<span class="rail-num">03</span>
		<h2>What you <em>get</em></h2>
		<p class="rail-desc">Fixed scope, clear timeline, direct line to the engineer doing the work.</p>
	</div>

	<div class="cap-list reveal">
		{#each capabilities as cap, i}
			<div class="cap-row">
				<span>{cap.index}</span>
				<h3>{cap.title}</h3>
				<p>{cap.description}</p>
				<span class="cap-tag">{capTags[i] ?? 'Full-stack'}</span>
			</div>
		{/each}
	</div>
</section>

<!-- ══════════ 04 / STACK ══════════ -->
<section class="section" aria-label="Tech stack">
	<div class="rail reveal">
		<span class="rail-num">04</span>
		<h2>Tools I <em>ship with</em></h2>
	</div>

	<div class="stack-cloud reveal">
		{#each stack as tech}
			<span>{tech}</span>
		{/each}
	</div>
</section>

<!-- ══════════ 05 / SECURITY ══════════ -->
<section class="section" aria-label="Security engineering">
	<div class="rail reveal">
		<span class="rail-num">05</span>
		<h2>Hardened, <em>not hopeful</em></h2>
		<p class="rail-desc">
			Cybersecurity engineering student (3.9 GPA) doing bug-bounty recon and audits.
			Your app ships with the attack surface already mapped.
		</p>
	</div>

	<div class="security-panel reveal">
		<div class="security-copy">
			<span class="section-kicker">Offensive background</span>
			<h2>Breaking things to build <em>better ones</em></h2>
			<p>Bug bounty programs, smart contract auditing, and application hardening — try the live analyzer below.</p>
			<ul class="security-list">
				<li>Bug bounty reconnaissance &amp; ASM</li>
				<li>Smart contract auditing (Viper-Web3)</li>
				<li>Web application security testing</li>
				<li>Firewall &amp; infrastructure hardening</li>
			</ul>
		</div>

		<div class="security-visual" aria-hidden="true">
			<div class="radar">
				<i></i><i></i><i></i><i></i>
				<b>ATTACK<br />SURFACE<br />ACTIVE</b>
			</div>
			<div class="scanline"></div>
		</div>
	</div>
</section>

<!-- ══════════ 06 / LIVE LAB ══════════ -->
<section id="lab" class="section" aria-label="Live lab">
	<div class="rail reveal">
		<span class="rail-num">06</span>
		<h2>Don't take my word — <em>test it</em></h2>
		<p class="rail-desc">
			This analyzer runs on my own edge infrastructure, live. Paste a Solidity
			contract and watch a real worker audit it.
		</p>
	</div>

	<div class="reveal">
		<ViperConsole />
	</div>
</section>

<!-- ══════════ 07 / INFRASTRUCTURE ══════════ -->
<section class="section" aria-label="System architecture">
	<div class="rail reveal">
		<span class="rail-num">07</span>
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

<!-- ══════════ MANIFESTO ══════════ -->
<section class="manifesto" aria-label="Manifesto">
	<p class="manifesto-mark" aria-hidden="true">—</p>
	<blockquote>
		I build things that work — where product meets <em>infrastructure and security.</em>
	</blockquote>
	<p>pwn4g3 · Jake Viefhaus · St. Louis, MO</p>
</section>

<!-- ══════════ 08 / HIRE ══════════ -->
<section id="career" class="section" aria-label="Hire me">
	<div class="rail reveal">
		<span class="rail-num">08</span>
		<h2>Hire <em>me</em></h2>
		<p class="rail-desc">Full-time roles, part-time IT and security work, freelance builds. One email starts it.</p>
	</div>

	<div class="hire-panel reveal">
		<div>
			<h3>Engineer + security mind, <em>one inbox away.</em></h3>
			<p>{profile.careerGoal}</p>
			<ul class="hire-points">
				<li>Reply within 24 hours, quote with fixed scope</li>
				<li>You own the code — transferred on final payment</li>
				<li>Direct line to the engineer, no middlemen</li>
			</ul>
			<ul class="service-chips" aria-label="Freelance services">
				{#each ['Full-stack builds', 'Frontend / redesigns', 'APIs', 'Automation', 'SEO / data', 'Security hardening'] as service}
					<li>{service}</li>
				{/each}
			</ul>
		</div>
		<div class="hire-cta">
			<a
				href={profile.resumeUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="button primary"
			>Download resume (PDF) <span aria-hidden="true">→</span></a>
			<a href="#booking" class="button ghost">Book a project <span aria-hidden="true">→</span></a>
			<a class="contact-link" href="mailto:{profile.email}">or email {profile.email} directly</a>
		</div>
	</div>
</section>

<!-- ══════════ 09 / BOOKING ══════════ -->
<section id="booking" class="section booking-section" aria-label="Book a project">
	<div class="rail reveal" style="display: block; text-align: center;">
		<span class="rail-num">09</span>
		<h2>Start a <em>project</em></h2>
		<p class="rail-desc" style="margin-left: auto; margin-right: auto;">
			Freelance builds, redesigns, APIs, automation. Fixed scope, clear timeline, reply within 24 hours.
		</p>
	</div>
	<div class="booking-narrow reveal">
		<BookingForm />
	</div>
</section>

<a href="#booking" class="mobile-cta">Get a free quote →</a>

<!-- ══════════ PROJECT MODAL ══════════ -->
{#if activeProject}
	<ProjectModal
		project={activeProject}
		onclose={() => (activeProject = null)}
	/>
{/if}
