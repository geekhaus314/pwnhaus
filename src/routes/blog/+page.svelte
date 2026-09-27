<script lang="ts">
	import { posts } from '$lib/data/posts';
</script>

<svelte:head>
	<title>Field Notes — pwn4g3</title>
	<meta name="description" content="Case studies, pricing transparency, and practical web advice for local businesses — from Jake Viefhaus (pwn4g3), full-stack developer in St. Louis." />
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Blog</p>
	<h1>Field <em>notes</em></h1>
	<p class="lede">Case studies from real client work, pricing in public, and practical advice for local businesses. No fluff — everything here ships.</p>
</section>

<section class="section post-list">
	{#each posts as post}
		<article class="reveal">
			<a class="post-card" href="/blog/{post.slug}">
				<div class="post-meta">
					<time datetime={post.date}>{post.date}</time>
					<span class="post-tags">{post.tags.join(' · ')}</span>
				</div>
				<h2>{post.title}</h2>
				<p>{post.excerpt}</p>
				<span class="read-more">Read →</span>
			</a>
		</article>
	{/each}
</section>

<style>
	.post-list { display: grid; gap: 1.25rem; padding-top: 0; }
	.post-card {
		display: block;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--card);
		padding: clamp(1.5rem, 3vw, 2.5rem);
		transition: transform 0.2s, border-color 0.2s;
	}
	.post-card:hover { transform: translateY(-3px); border-color: var(--accent); }
	.post-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		font: 600 0.62rem var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted);
	}
	.post-card h2 {
		margin: 0.75rem 0 0.5rem;
		font-family: var(--font-heading);
		font-weight: 500;
		font-size: clamp(1.6rem, 3vw, 2.2rem);
		line-height: 1.05;
	}
	.post-card p { margin: 0; color: var(--muted); line-height: 1.7; max-width: 44em; }
	.read-more { display: inline-block; margin-top: 1rem; color: var(--accent-bright); font: 600 0.7rem var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; }
</style>
