<script lang="ts">
	import { themeStore } from '$lib/stores/theme';
	import { GATEWAY_BASE } from '$lib/config';

	const HUNT_URL: string = `${GATEWAY_BASE}/hive/hunt`;
</script>

{#if $themeStore === 'paper'}
	<a class="sticky-note" href={HUNT_URL} target="_blank" rel="noopener noreferrer" aria-label="A sticky note daring you to hack this site">
		<span class="tape" aria-hidden="true"></span>
		<p>Psst.<br />Hack my site.<br />There are hidden messages.<br /><em>/hive/hunt</em></p>
	</a>
{:else}
	<a class="ghost-note" href={HUNT_URL} target="_blank" rel="noopener noreferrer" aria-label="A note daring you to hack this site">
		<span class="prompt" aria-hidden="true">&lt;/&gt;</span>
		<p>hack the site · hidden messages · <em>/hive/hunt</em></p>
	</a>
{/if}

<style>
	.ghost-note {
		position: fixed;
		right: 1.25rem;
		bottom: 1.25rem;
		z-index: 40;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.9rem;
		background: var(--surface-raised);
		border: 1px solid var(--accent);
		color: var(--ink);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		text-decoration: none;
		box-shadow: 0 4px 14px var(--shadow);
		opacity: 0.92;
		transition: transform 0.15s ease, opacity 0.15s ease;
	}
	.ghost-note:hover {
		transform: translateY(-2px);
		opacity: 1;
	}
	.ghost-note p {
		margin: 0;
	}
	.ghost-note em {
		color: var(--accent-bright);
		font-style: normal;
	}
	.prompt {
		color: var(--accent-bright);
	}
	.sticky-note {
		position: fixed;
		right: 1.25rem;
		bottom: 1.25rem;
		z-index: 40;
		display: block;
		width: 10.5rem;
		padding: 1.2rem 1rem 1rem;
		background: #f6e58d;
		color: #2f3640;
		font-family: 'Comic Sans MS', 'Segoe Print', cursive;
		font-size: 0.8rem;
		line-height: 1.35;
		text-decoration: none;
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
		transform: rotate(-3deg);
		transition: transform 0.15s ease;
	}
	.sticky-note:hover {
		transform: rotate(0deg) scale(1.04);
	}
	.sticky-note p {
		margin: 0;
	}
	.sticky-note em {
		font-style: normal;
		font-weight: bold;
	}
	.tape {
		position: absolute;
		top: -0.55rem;
		left: 50%;
		width: 3.2rem;
		height: 1.1rem;
		transform: translateX(-50%) rotate(-2deg);
		background: rgba(255, 255, 255, 0.45);
	}
</style>
