<script lang="ts">
	import ProjectCard from '$lib/components/ProjectCard.svelte';
	import ProjectModal from '$lib/components/ProjectModal.svelte';
	import { projects, projectFilters, type ProjectFilter, type Project } from '$lib/data/projects';

	let activeProject = $state<Project | null>(null);
	let activeFilter = $state<ProjectFilter>('All');

	const filtered = $derived(
		activeFilter === 'All' ? projects : projects.filter((p) => p.type === activeFilter)
	);
</script>

<svelte:head>
	<title>Live Work — pwn4g3</title>
	<meta name="description" content="Production sites, client work, and security tooling by Jake Viefhaus (pwn4g3) — live deployments, not mockups. Click any project for breakdowns and links." />
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Portfolio</p>
	<h1>Live work, <em>not mockups</em></h1>
	<p class="lede">
		Green badge = running in production today. Click any card for the full
		breakdown, screenshots, and links. Like what you see? <a href="/book">Get a free quote →</a>
	</p>
</section>

<section class="section work-grid-section">
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

<section class="cta">
	<p class="eyebrow"><i aria-hidden="true"></i> Your project here</p>
	<h2>Want this <em>standard?</em></h2>
	<p>Fixed scope, clear timeline, reply within 24 hours.</p>
	<a class="button primary" href="/book">Book a project <span>→</span></a>
</section>

{#if activeProject}
	<ProjectModal project={activeProject} onclose={() => (activeProject = null)} />
{/if}

<style>
	.work-grid-section { padding-top: 0; }
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
