<script lang="ts">
	import { profile } from '$lib/data/profile';
</script>

<svelte:head>
	<title>Not found — pwn4g3</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="error-hero section" aria-label="Page not found">
	<p class="eyebrow"><i aria-hidden="true"></i> 404</p>
	<h1>Not <em>found</em></h1>
	<p class="lede">The page you're looking for doesn't exist — or it moved.</p>
	<div class="hero-actions">
		<a href="/#top" class="button primary">Back to home <span>→</span></a>
		<a href="/#booking" class="button ghost">Book a project <span>→</span></a>
	</div>
	<p class="meta">
		<a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
		<a href="mailto:{profile.email}">Email</a>
	</p>
</section>

<style>
	.error-hero {
		min-height: 70vh;
		display: grid;
		align-content: center;
		justify-items: start;
	}
	h1 {
		font-size: clamp(3rem, 8vw, 7rem);
		line-height: 0.9;
		margin: 0.5rem 0 1.25rem;
	}
	.lede {
		color: var(--muted, #898681);
		font-size: 1.05rem;
		line-height: 1.7;
		max-width: 34em;
	}
	.meta {
		margin-top: 3rem;
		display: flex;
		gap: 1.5rem;
		font: 0.65rem var(--font-mono, monospace);
		color: rgba(236, 231, 224, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.meta a { text-decoration: underline; text-decoration-color: rgba(236, 231, 224, 0.3); }
</style>