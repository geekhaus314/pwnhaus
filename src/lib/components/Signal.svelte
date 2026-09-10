<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	type Status = 'checking' | 'online' | 'offline';

	const WORKER_HEALTH = 'https://pwn4g3.geekhaus314.workers.dev/health';
	const BASE_INTERVAL_MS = 30_000;
	const MAX_INTERVAL_MS = 5 * 60_000;
	const RETRY_BACKOFF_MS = 2_000;

	let status = $state<Status>('checking');
	let timer: ReturnType<typeof setInterval>;
	let retryTimer: ReturnType<typeof setTimeout> | null = null;
	let consecutiveFailures = 0;

	function getInterval(): number {
		return Math.min(BASE_INTERVAL_MS * Math.pow(2, consecutiveFailures), MAX_INTERVAL_MS);
	}

	async function check() {
		try {
			const res = await fetch(WORKER_HEALTH, { cache: 'no-store' });
			if (res.ok) {
				consecutiveFailures = 0;
				status = 'online';
			} else {
				consecutiveFailures++;
				status = 'offline';
			}
		} catch {
			consecutiveFailures++;
			status = 'offline';
		}
	}

	function scheduleNext() {
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			check();
			scheduleNext();
		}, getInterval());
	}

	function scheduleRetry() {
		if (retryTimer) clearTimeout(retryTimer);
		retryTimer = setTimeout(() => {
			check();
			if (status === 'online') {
				consecutiveFailures = 0;
				scheduleNext();
			} else {
				scheduleRetry();
			}
		}, RETRY_BACKOFF_MS);
	}

	onMount(() => {
		check();
		scheduleNext();
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
		if (retryTimer) clearTimeout(retryTimer);
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