<script lang="ts">
	import { onMount } from 'svelte';

	interface Stats {
		repos: number;
		stars: number;
		languages: number;
	}

	let stats = $state<Stats | null>(null);
	let error = $state(false);

	function loadStats() {
		// Check localStorage cache first (TTL: 1 hour)
		try {
			const cached = localStorage.getItem('gh-stats-cache');
			if (cached) {
				const { data, timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp < 3_600_000) {
					stats = data;
				}
			}
		} catch { /* ignore cache errors */ }

		fetch('https://api.github.com/users/geekhaus314/repos?per_page=100&sort=updated', {
			headers: { 'Accept': 'application/vnd.github.v3+json' }
		})
			.then((res) => {
				if (!res.ok) throw new Error('GitHub API error');
				return res.json();
			})
			.then((repos: Array<{ fork: boolean; stargazers_count: number; language: string | null }>) => {
				const pub = repos.filter((r) => !r.fork);
				stats = {
					repos: pub.length,
					stars: pub.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0),
					languages: new Set(pub.map((r) => r.language).filter(Boolean)).size
				};
				try {
					localStorage.setItem('gh-stats-cache', JSON.stringify({ data: stats, timestamp: Date.now() }));
				} catch { /* ignore storage errors */ }
			})
			.catch(() => { error = true; });
	}

	onMount(loadStats);
</script>

{#if error}
	<div class="github-stats reveal">
		<div class="stat">
			<p class="value">—</p>
			<p class="label">Stats unavailable</p>
		</div>
	</div>
{/if}

{#if stats && !error}
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
