<script lang="ts">
	import type { Project } from '$lib/data/projects';

	interface Props {
		project: Project;
		onopen: (p: Project) => void;
	}

	let { project, onopen }: Props = $props();

	// NOTE (#23): R2 currently serves only the PNG originals — the .avif/.webp
	// variants were never mirrored (404). <picture> picks the first supported
	// <source> and does NOT fall back to <img> when it 404s, so derive modern
	// variants from local /shots/* (served by Pages) and keep the R2 PNG as
	// the <img> fallback. Flip back to CDN derivatives once R2 has the variants.
	const fileName = (src: string) => src.split('/').pop() ?? src;
	const avifSrc = (src: string) => `/shots/${fileName(src).replace(/\.(png|jpe?g)$/i, '.avif')}`;
	const webpSrc = (src: string) => `/shots/${fileName(src).replace(/\.(png|jpe?g)$/i, '.webp')}`;
</script>

<button
	class="project-card"
	onclick={() => onopen(project)}
	aria-label="View details for {project.name}"
>
	<div class="project-media">
		{#if project.images[0]}
			<picture>
				<source srcset={avifSrc(project.images[0])} type="image/avif" />
				<source srcset={webpSrc(project.images[0])} type="image/webp" />
				<img src={project.images[0]} alt="{project.name} preview" loading="lazy" />
			</picture>
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
