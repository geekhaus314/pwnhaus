<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.post.title} — pwn4g3</title>
	<meta name="description" content={data.post.excerpt} />
</svelte:head>

<article class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> <a href="/blog">Field notes</a> · <time datetime={data.post.date}>{data.post.date}</time></p>
	<h1>{data.post.title}</h1>
	<p class="lede">{data.post.excerpt}</p>
</article>

<section class="section">
	<div class="prose reveal revealed">
		{@html data.post.body}
	</div>
	<nav class="post-nav" aria-label="More posts">
		{#if data.prev}
			<a href="/blog/{data.prev.slug}">← {data.prev.title}</a>
		{/if}
		{#if data.next}
			<a href="/blog/{data.next.slug}">{data.next.title} →</a>
		{/if}
	</nav>
	<div class="post-cta">
		<h2>Want this standard <em>on your site?</em></h2>
		<p>Fixed scope, 24h response, email or text.</p>
		<a class="button primary" href="/book">Book a project →</a>
		<a class="button ghost" href="/shop">Or buy the audit →</a>
	</div>
</section>

<style>
	.prose {
		max-width: 46em;
		line-height: 1.8;
		color: var(--muted);
	}
	.prose :global(h2) {
		font-family: var(--font-heading);
		font-weight: 500;
		font-size: clamp(1.5rem, 2.6vw, 2rem);
		color: var(--ink);
		margin: 2.25rem 0 0.75rem;
		letter-spacing: var(--heading-spacing);
	}
	.prose :global(p) { margin: 0 0 1.1rem; }
	.prose :global(ul) { margin: 0 0 1.25rem; padding-left: 1.25rem; display: grid; gap: 0.5rem; }
	.prose :global(li::marker) { color: var(--accent-bright); }
	.prose :global(strong) { color: var(--ink); }
	.prose :global(a) { color: var(--accent-bright); text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 3px; }
	.prose :global(a:hover) { text-decoration-color: var(--accent-bright); }
	.post-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: space-between;
		max-width: 46em;
		margin: 3rem 0 0;
		padding-top: 1.5rem;
		border-top: 1px solid var(--line);
	}
	.post-nav a { color: var(--accent-bright); font: 600 0.75rem var(--font-mono); }
	.post-cta { text-align: center; padding: 4rem 5vw 6rem; }
	.post-cta h2 {
		font-family: var(--font-heading);
		font-size: clamp(2rem, 4.5vw, 3rem);
		font-weight: 500;
		margin: 0 0 0.75rem;
	}
	.post-cta em { color: var(--accent); font-style: italic; }
	.post-cta p { color: var(--muted); }
	.post-cta .button { display: inline-block; margin: 0.75rem 0.35rem 0; }
</style>
