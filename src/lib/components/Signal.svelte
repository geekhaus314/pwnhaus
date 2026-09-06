<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	type Status = 'checking' | 'online' | 'offline';

	const WORKER_HEALTH = 'https://pwn4ge.geekhaus314.workers.dev/health';
	const CHECK_INTERVAL_MS = 60_000;

	let status = $state<Status>('checking');
	let timer: ReturnType<typeof setInterval>;

	async function check() {
		try {
			const res = await fetch(WORKER_HEALTH, { cache: 'no-store' });
			status = res.ok ? 'online' : 'offline';
		} catch {
			status = 'offline';
		}
	}

	onMount(() => {
		check();
		timer = setInterval(check, CHECK_INTERVAL_MS);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});
</script>

<div class="signal" role="status" aria-live="polite">
	<span class="dot" class:active={status === 'online'} class:off={status === 'offline'}></span>
	<span>
		{#if status === 'checking'}
			CHECKING EDGE SIGNAL…
		{:else if status === 'online'}
			EDGE SIGNAL NOMINAL
		{:else}
			EDGE SIGNAL OFFLINE
		{/if}
	</span>
</div>

<style>
	.signal {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		width: 100%;
		border: 1px solid rgba(236, 231, 224, 0.12);
		background: transparent;
		color: #aaa6a0;
		padding: 0.8rem;
		font: 0.62rem var(--font-mono, monospace);
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #555;
		flex-shrink: 0;
	}
	.dot.active {
		background: var(--accent, #a51d37);
		box-shadow: 0 0 14px var(--accent, #a51d37);
	}
	.dot.off {
		background: #d16666;
		box-shadow: 0 0 14px rgba(209, 102, 102, 0.8);
	}
</style>