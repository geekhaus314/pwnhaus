<script lang="ts">
	import Terminal from '$lib/components/Terminal.svelte';
	import HeroCanvas from '$lib/components/HeroCanvas.svelte';
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import ProjectModal from '$lib/components/ProjectModal.svelte';
	import PaperDoodles from '$lib/components/PaperDoodles.svelte';
	import RipTape from '$lib/components/RipTape.svelte';

	import { projects, type Project } from '$lib/data/projects';
	import { profile, capabilities } from '$lib/data/profile';

	let activeProject = $state<Project | null>(null);

	// First glance = proof: only live, clickable deployments.
	const featured = $derived(projects.filter((p) => p.url).slice(0, 3));
</script>

<svelte:head>
	<title>Jake Viefhaus (pwn4g3) — Full-Stack Developer for Hire</title>
	<meta name="description" content="Hire Jake Viefhaus (pwn4g3): full-stack developer in St. Louis shipping production websites, online stores, APIs, and edge infrastructure. Live client work, free quotes, 24h response." />
</svelte:head>

<HeroCanvas />

<!-- ══════════ HERO — the 5-second hire test ══════════ -->
<section id="top" class="hero">
	<div class="hero-copy">
		<p class="status-line"><i aria-hidden="true"></i> Available for hire — replies in 24h</p>

		<h1>Hire a developer who <em>ships.</em></h1>

		<p class="hero-who">
			<span class="accent">Jake Viefhaus (pwn4g3)</span> — full-stack developer,
			St.&nbsp;Louis&nbsp;MO · remote OK ·
			<a href={profile.github} target="_blank" rel="noopener noreferrer">@geekhaus314</a>
		</p>

		<p class="lede">
			Production websites, online stores, and booking systems for local businesses —
			plus the APIs and infrastructure behind them. <strong>Every project below is
			live:</strong> click through and kick the tires before you ever email me.
		</p>

		<div class="hero-actions">
			<a href="/book" class="button primary big">Book a project <span aria-hidden="true">→</span></a>
			<a href="/work" class="button ghost">See live work <span aria-hidden="true">→</span></a>
		</div>

		<ul class="hero-proof" aria-label="Hiring highlights">
			<li><b>3</b> production sites live</li>
			<li><b>24h</b> quote turnaround</li>
			<li><b>3.9</b> GPA · CS / Cybersecurity</li>
			<li><b>You</b> own the code</li>
		</ul>

		<div class="hero-meta">
			<span>Full-stack · Frontend · APIs · Security</span>
			<a href="mailto:{profile.email}">{profile.email}</a>
		</div>
	</div>

	<div class="hero-visual">
		<Terminal />
	</div>

	<PaperDoodles />
</section>

<!-- ══════════ TICKER ══════════ -->
<div class="ticker" aria-hidden="true">
	<div class="ticker-track">
		<span>Websites ✦ Online stores ✦ Booking systems ✦ APIs ✦ Automation ✦ Security ✦&nbsp;</span>
		<span>Websites ✦ Online stores ✦ Booking systems ✦ APIs ✦ Automation ✦ Security ✦&nbsp;</span>
	</div>
</div>

<!-- ══════════ TRUST STRIP ══════════ -->
<RipTape text="available for hire — replies in 24h" />
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

<!-- ══════════ FEATURED WORK ══════════ -->
<section class="section" aria-label="Featured work">
	<div class="rail reveal">
		<span class="rail-num">01</span>
		<h2>Proof, <em>not promises</em></h2>
		<p class="rail-desc">
			Live client and production work — green badge means you can open it right now.
			<a href="/work">Browse all {projects.length} projects →</a>
		</p>
	</div>

	<div class="project-grid">
		{#each featured as project (project.id)}
			<div class="reveal">
				<ProjectCard {project} onopen={(p) => (activeProject = p)} />
			</div>
		{/each}
	</div>
</section>

<!-- ══════════ SERVICES TEASER ══════════ -->
<section class="section" aria-label="Services">
	<div class="rail reveal">
		<span class="rail-num">02</span>
		<h2>Fixed price, <em>no mystery invoices</em></h2>
		<p class="rail-desc">
			Launch sites from $1,200 · custom apps from $2,800 · ongoing engineering partnerships.
			<a href="/services">Full pricing →</a>
		</p>
	</div>

	<div class="cap-list reveal">
		{#each capabilities.slice(0, 3) as cap}
			<div class="cap-row">
				<span>{cap.index}</span>
				<h3>{cap.title}</h3>
				<p>{cap.description}</p>
				<span class="cap-tag">From $1,200</span>
			</div>
		{/each}
	</div>
</section>

<!-- ══════════ SECURITY / LAB TEASER ══════════ -->
<section class="section" aria-label="Security engineering">
	<div class="rail reveal">
		<span class="rail-num">03</span>
		<h2>Hardened, <em>not hopeful</em></h2>
		<p class="rail-desc">
			Cybersecurity engineering student (3.9 GPA) doing bug-bounty recon and audits.
			Your app ships with the attack surface already mapped.
			<a href="/lab">Try the live analyzer →</a>
		</p>
	</div>

	<div class="security-panel reveal">
		<div class="security-copy">
			<span class="section-kicker">Offensive background</span>
			<h2>Breaking things to build <em>better ones</em></h2>
			<p>
				Bug bounty reconnaissance, smart contract auditing, application hardening —
				running live on my own edge infrastructure. Paste a contract, watch a real worker audit it.
			</p>
			<ul class="security-list">
				<li>Bug bounty reconnaissance &amp; ASM</li>
				<li>Smart contract auditing (Viper-Web3)</li>
				<li>Web application security testing</li>
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

<!-- ══════════ HIRE ══════════ -->
<section class="section" aria-label="Hire me">
	<div class="rail reveal">
		<span class="rail-num">04</span>
		<h2>One email <em>starts it</em></h2>
		<p class="rail-desc">Full-time roles, part-time IT and security work, freelance builds.</p>
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
		</div>
		<div class="hire-cta">
			<a href="/book" class="button primary">Book a project <span aria-hidden="true">→</span></a>
			<a
				href={profile.resumeUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="button ghost"
			>Resume (PDF) <span aria-hidden="true">→</span></a>
			<a class="contact-link" href="mailto:{profile.email}">or email {profile.email} directly</a>
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

<a href="/book" class="mobile-cta">Get a free quote →</a>

<!-- ══════════ PROJECT MODAL ══════════ -->
{#if activeProject}
	<ProjectModal
		project={activeProject}
		onclose={() => (activeProject = null)}
	/>
{/if}
