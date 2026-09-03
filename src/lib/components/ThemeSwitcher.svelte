<script lang="ts">
	import { themeStore } from '$lib/stores/theme';
	import { themes } from '$lib/data/themes';

	let current = $state('nocturne');
	themeStore.subscribe((v) => (current = v));
</script>

<div class="theme-switcher" role="group" aria-label="Visual theme">
	{#each Object.entries(themes) as [name, def]}
		<button
			type="button"
			class:active={current === name}
			onclick={() => themeStore.apply(name)}
			title={def.description}
			aria-pressed={current === name}
		>
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
	button:hover,
	button.active {
		color: var(--ink, #ece7e0);
		border-color: var(--accent, #a51d37);
	}
	button.active {
		background: color-mix(in srgb, var(--accent, #a51d37) 12%, transparent);
	}
</style>
