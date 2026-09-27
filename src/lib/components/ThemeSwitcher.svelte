<script lang="ts">
	import { themeStore } from '$lib/stores/theme';
	import { themes } from '$lib/data/themes';

	let current = $state('nocturne');
	themeStore.subscribe((v) => (current = v));
</script>

<div class="theme-switcher" role="group" aria-label="Visual theme — each one restyles the whole site">
	{#each Object.entries(themes) as [name, def] (name)}
		<button
			type="button"
			class:active={current === name}
			onclick={() => themeStore.apply(name)}
			title={`${def.label} — ${def.description}`}
			aria-pressed={current === name}
		>
			<i aria-hidden="true" style="background: {def.accent}; box-shadow: 0 0 0 1px {def.page}"></i>
			{def.label}
		</button>
	{/each}
</div>

<style>
	.theme-switcher {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	button {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border: var(--border-w) solid var(--line);
		background: transparent;
		color: var(--muted);
		padding: 0.35rem 0.6rem;
		font: 600 0.6rem var(--font-mono);
		text-transform: var(--label-transform);
		letter-spacing: var(--label-tracking);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: 0.2s;
	}
	button i {
		width: 9px;
		height: 9px;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}
	button:hover,
	button.active {
		color: var(--ink);
		border-color: var(--accent);
	}
	button.active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}
</style>
