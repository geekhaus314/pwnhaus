<script lang="ts">
	import { onMount } from 'svelte';

	interface Stats {
		repos: number;
		stars: number;
		languages: number;
	}

	let stats = $state<Stats | null>(null);

	onMount(async () => {
		try {
			const res = await fetch('https://api.github.com/users/geekhaus314/repos?per_page=100&sort=updated');
			if (!res.ok) return;
			const repos: Array<{ fork: boolean; stargazers_count: number; language: string | null }> = await res.json();
			const pub = repos.filter((r) => !r.fork);
			stats = {
				repos: pub.length,
				stars: pub.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0),
				languages: new Set(pub.map((r) => r.language).filter(Boolean)).size
			};
		} catch {
			// silently suppress — stats are decorative
		}
	});
</script>

{#if stats}
	<div class="github-stats reveal">
		<div class="stat">
			<p class="value">{stats.repos}</p>
			<p class="label">Public repos</p>
		</div>
		<div class="stat">
			<p class="value">{stats.stars}</p>
			<p class="label">GitHub stars</p>
		</div>
		<div class="stat">
			<p class="value">{stats.languages}</p>
			<p class="label">Languages</p>
		</div>
	</div>
{/if}

<style>
	.github-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		max-width: 480px;
		margin-top: 2rem;
	}
	.stat {
		border: 1px solid rgba(236, 231, 224, 0.1);
		background: var(--surface, #080a0d);
		padding: 1rem;
		text-align: center;
	}
	.value {
		font-family: var(--font-serif, Georgia, serif);
		font-size: 1.8rem;
		color: var(--ink, #ece7e0);
		margin: 0;
	}
	.label {
		margin: 0.25rem 0 0;
		font: 0.6rem var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: rgba(236, 231, 224, 0.4);
	}
</style>
