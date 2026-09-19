<script lang="ts">
	import GitHubStats from '$lib/components/GitHubStats.svelte';
	import { profile, stack } from '$lib/data/profile';
</script>

<svelte:head>
	<title>About — Jake Viefhaus (pwn4g3)</title>
	<meta name="description" content="Jake Viefhaus (pwn4g3): full-stack developer and cybersecurity engineering student in St. Louis. One hire covering design, code, deployment, and hardening." />
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> About</p>
	<h1>The dev behind <em>the work</em></h1>
	<p class="lede">One hire covering design, code, deployment, and hardening — no handoffs, no gaps.</p>
</section>

<section class="section">
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

<section class="section" aria-label="Career goal">
	<div class="rail reveal">
		<span class="rail-num">◈</span>
		<h2>Where I'm <em>headed</em></h2>
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
			<a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" class="button primary">
				Download resume (PDF) <span aria-hidden="true">→</span>
			</a>
			<a href={profile.cvUrl} target="_blank" rel="noopener noreferrer" class="button ghost">
				CV (PDF) <span aria-hidden="true">→</span>
			</a>
			<a href="/book" class="button ghost">Book a project</a>
			<a class="contact-link" href="mailto:{profile.email}">or email {profile.email} directly</a>
		</div>
	</div>
</section>

<section class="section" aria-label="Tech stack">
	<div class="rail reveal">
		<span class="rail-num">◈</span>
		<h2>Tools I <em>ship with</em></h2>
	</div>
	<div class="stack-cloud reveal">
		{#each stack as tech}
			<span>{tech}</span>
		{/each}
	</div>
</section>
