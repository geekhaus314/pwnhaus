<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Project } from '$lib/data/projects';

	interface Props {
		project: Project;
		onclose: () => void;
	}

	let { project, onclose }: Props = $props();

	let imageIndex = $state(0);
	let dialogEl: HTMLDialogElement;

	function prev() {
		imageIndex = (imageIndex - 1 + project.images.length) % project.images.length;
	}
	function next() {
		imageIndex = (imageIndex + 1) % project.images.length;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'ArrowRight' && project.images.length > 1) next();
		if (e.key === 'ArrowLeft' && project.images.length > 1) prev();
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === dialogEl) onclose();
	}

	onMount(() => {
		document.body.style.overflow = 'hidden';
		dialogEl?.showModal();
		window.addEventListener('keydown', onKeydown);
	});

	onDestroy(() => {
		document.body.style.overflow = '';
		window.removeEventListener('keydown', onKeydown);
	});
</script>

<dialog
	bind:this={dialogEl}
	onclick={onBackdropClick}
	aria-label={project.name}
	class="modal-dialog"
>
	<div class="modal" role="document">
		<button class="modal-close" onclick={onclose} aria-label="Close modal">Close ✕</button>

		<div class="modal-header">
			<h2>{project.name}</h2>
			<p class="modal-tagline">{project.tagline}</p>
		</div>

		{#if project.images.length > 0}
			<div class="modal-images">
				<div class="main-image">
					<img
						src={project.images[imageIndex]}
						alt="{project.name} screenshot {imageIndex + 1} of {project.images.length}"
					/>
					{#if project.images.length > 1}
						<button class="nav-btn prev" onclick={prev} aria-label="Previous image">‹</button>
						<button class="nav-btn next" onclick={next} aria-label="Next image">›</button>
						<div class="dots">
							{#each project.images as _, i}
								<button
									aria-label="View image {i + 1}"
									class:active={i === imageIndex}
									onclick={() => (imageIndex = i)}
								></button>
							{/each}
						</div>
					{/if}
				</div>
				{#if project.images.length > 1}
					<div class="thumbnails">
						{#each project.images as img, i}
							<button
								class:active={i === imageIndex}
								onclick={() => (imageIndex = i)}
								aria-label="View image {i + 1}"
							>
								<img src={img} alt="" loading="lazy" />
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="no-images">Screenshots coming soon — this project is in active development.</div>
		{/if}

		<div class="modal-body">
			{#each project.detail as line}
				<p>{line}</p>
			{/each}

			<div class="tags">
				{#each project.stack as tech}
					<span>{tech}</span>
				{/each}
			</div>

			<div class="modal-actions">
				{#if project.url}
					<a href={project.url} target="_blank" rel="noopener noreferrer" class="button primary">
						Visit live site
					</a>
				{/if}
				<a href={project.repo} target="_blank" rel="noopener noreferrer" class="button ghost">
					View code
				</a>
			</div>
		</div>
	</div>
</dialog>

<style>
	.modal-dialog {
		padding: 0;
		border: none;
		background: transparent;
		max-width: 800px;
		width: calc(100% - 2rem);
		max-height: 90vh;
	}

	.modal-dialog::backdrop {
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(8px);
	}

	.modal {
		position: relative;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		background: #0b0d10;
		border: 1px solid rgba(236, 231, 224, 0.14);
		box-shadow: 0 30px 100px rgba(0, 0, 0, 0.7);
	}

	.modal-header {
		padding: 1.5rem 2rem 1rem;
		border-bottom: 1px solid rgba(236, 231, 224, 0.08);
	}
	.modal-header h2 {
		font-family: var(--font-serif, Georgia, serif);
		font-size: 2.2rem;
		margin: 0 0 0.4rem;
		color: var(--ink, #ece7e0);
	}
	.modal-tagline {
		margin: 0;
		font-size: 0.85rem;
		color: #77736e;
	}

	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(0,0,0,0.6);
		border: none;
		color: var(--ink, #ece7e0);
		font: 0.65rem var(--font-mono, monospace);
		padding: 0.4rem 0.75rem;
		cursor: pointer;
		z-index: 10;
	}
	.modal-close:hover { background: var(--accent, #a51d37); }

	.main-image {
		position: relative;
		background: rgba(0, 0, 0, 0.4);
	}
	.main-image img {
		width: 100%;
		max-height: 50vh;
		object-fit: contain;
		display: block;
	}

	.nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(0, 0, 0, 0.6);
		border: none;
		color: var(--ink, #ece7e0);
		font-size: 1.8rem;
		width: 2.5rem;
		height: 2.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}
	.nav-btn:hover { background: var(--accent, #a51d37); }
	.prev { left: 0.5rem; }
	.next { right: 0.5rem; }

	.dots {
		position: absolute;
		bottom: 0.75rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 0.4rem;
	}
	.dots button {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: none;
		background: rgba(236, 231, 224, 0.3);
		cursor: pointer;
		padding: 0;
	}
	.dots button.active { background: var(--accent, #a51d37); }

	.thumbnails {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding: 0.75rem 1rem;
		background: rgba(0, 0, 0, 0.3);
	}
	.thumbnails button {
		flex-shrink: 0;
		border: 2px solid transparent;
		background: none;
		cursor: pointer;
		padding: 0;
		border-radius: 2px;
		overflow: hidden;
		transition: border-color 0.2s;
	}
	.thumbnails button.active { border-color: var(--accent, #a51d37); }
	.thumbnails button img { width: 80px; height: 52px; object-fit: cover; display: block; }

	.no-images {
		padding: 3rem;
		text-align: center;
		color: rgba(236, 231, 224, 0.4);
		font-style: italic;
		font-size: 0.9rem;
	}

	.modal-body {
		padding: 1.5rem 2rem 2rem;
		border-top: 1px solid rgba(236, 231, 224, 0.08);
	}
	.modal-body p {
		font-size: 0.875rem;
		color: rgba(236, 231, 224, 0.7);
		line-height: 1.7;
		margin: 0 0 0.75rem;
	}

	.modal-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}

	.button {
		display: inline-block;
		padding: 0.65rem 1.25rem;
		font: 600 0.75rem var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: 0.2s;
		text-decoration: none;
	}
	.button.primary {
		background: var(--accent, #a51d37);
		border: 1px solid var(--accent, #a51d37);
		color: #fff;
	}
	.button.primary:hover { opacity: 0.9; }
	.button.ghost {
		border: 1px solid rgba(236, 231, 224, 0.25);
		color: rgba(236, 231, 224, 0.8);
	}
	.button.ghost:hover { border-color: var(--accent, #a51d37); }
</style>
