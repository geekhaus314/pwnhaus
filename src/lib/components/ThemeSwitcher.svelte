<script lang="ts">
	import { themeStore } from '$lib/stores/theme';
	import { themes } from '$lib/data/themes';

	let current = $state('nocturne');
	themeStore.subscribe((v) => (current = v));
</script>

<div class="theme-switcher" role="group" aria-label="Visual theme — each one restyles the whole site">
	{#each Object.entries(themes) as [name, def]}
		<button
			type="button"
			class:active={current === name}
			onclick={() => themeStore.apply(name)}
			title={`${def.label} — ${def.description}`}
			aria-pressed={current === name}
		>
			<i aria-hidden="true" style="background: {def.variables.accent}"></i>
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
		border: 1px solid rgba(236, 231, 224, 0.15);
		background: transparent;
		color: #77736e;
		padding: 0.35rem 0.6rem;
		font: 0.6rem var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
		transition: 0.2s;
	}
	button i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	button:hover,
	button.active {
		color: var(--ink, #ece7e0);
		border-color: var(--accent, #a51d37);
	}
	button.active {
		background: color-mix(in srgb, var(--accent, #a51d37) 12%, transparent);
	}
</style>
