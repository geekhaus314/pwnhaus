<script lang="ts">
	import type { Project } from '$lib/data/projects';

	interface Props {
		project: Project;
		onopen: (p: Project) => void;
	}

	let { project, onopen }: Props = $props();
</script>

<button
	class="project-card"
	onclick={() => onopen(project)}
	aria-label="View details for {project.name}"
>
	<div class="project-media">
		{#if project.images[0]}
			<img src={project.images[0]} alt="{project.name} preview" loading="lazy" />
		{:else}
			<div class="project-placeholder">
				<span>{project.type}</span>
				<strong>{project.name}</strong>
				<i>→</i>
			</div>
		{/if}
	</div>
	<div class="project-info">
		<div>
			<p class="project-type">{project.type}</p>
			<h3>{project.name}</h3>
			<p>{project.tagline}</p>
			<div class="stack-pills">
				{#each project.stack.slice(0, 3) as tech}
					<span>{tech}</span>
				{/each}
			</div>
		</div>
		<span class="arrow">→</span>
	</div>
</button>

<style>
	.project-card {
		display: block;
		width: 100%;
		text-align: left;
	}
	.stack-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}
	.stack-pills span {
		font: 0.6rem var(--font-mono, monospace);
		color: rgba(236, 231, 224, 0.4);
	}
</style>
