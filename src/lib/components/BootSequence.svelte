<script lang="ts">
	import { onMount } from 'svelte';

	// pwn4g3/OS boot overlay: kernel-style bring-up naming the real
	// infrastructure, once per tab session. Skippable (click/keypress),
	// disabled for reduced-motion, SSR-safe (renders only after mount).
	const LINES = [
		'pwn4g3/OS v5.0 — secure application runtime',
		'[  ok  ] edge kernel: cloudflare pages · ssr/ssg',
		'[  ok  ] gateway: pwn4g3 → 10 service bindings',
		'[  ok  ] pipeline: booking → queue → resend · turnstile armed',
		'[  ok  ] store: d1 pwn4g3-db · r2 pwn4g3-assets',
		'[  ok  ] lab: viper-web3 analyzer online',
		'[ hire ] status: available — replies in 24h'
	];

	let visible = $state(false);
	let shown = $state<string[]>([]);
	let done = $state(false);

	function finish() {
		try {
			sessionStorage.setItem('pwn4g3-booted', '1');
		} catch {
			/* ignore */
		}
		done = true;
		window.setTimeout(() => (visible = false), 350);
	}

	onMount(() => {
		let seen = false;
		try {
			seen = sessionStorage.getItem('pwn4g3-booted') === '1';
		} catch {
			seen = true;
		}
		if (seen) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			try {
				sessionStorage.setItem('pwn4g3-booted', '1');
			} catch {
				/* ignore */
			}
			return;
		}
		visible = true;
		let i = 0;
		const step = () => {
			if (i < LINES.length) {
				shown = [...shown, LINES[i]];
				i++;
				window.setTimeout(step, 130);
			} else {
				window.setTimeout(finish, 650);
			}
		};
		step();
		const skip = () => finish();
		window.addEventListener('pointerdown', skip, { once: true });
		window.addEventListener('keydown', skip, { once: true });
		return () => {
			window.removeEventListener('pointerdown', skip);
			window.removeEventListener('keydown', skip);
		};
	});
</script>

{#if visible}
	<div class="boot" class:done role="status" aria-label="Site boot sequence">
		<div class="boot-box">
			{#each shown as line}
				<p>{line}</p>
			{/each}
			<p class="cursor" aria-hidden="true">█</p>
		</div>
	</div>
{/if}

<style>
	.boot {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: grid;
		place-items: center;
		background: var(--page);
		transition: opacity 0.35s ease;
		cursor: pointer;
	}
	.boot.done { opacity: 0; pointer-events: none; }
	.boot-box {
		width: min(560px, 90vw);
		font: 0.8rem/1.9 var(--font-mono, monospace);
		color: var(--muted);
	}
	.boot-box p { margin: 0; overflow-wrap: anywhere; }
	.boot-box p:last-child { color: var(--accent-bright); }
	.cursor { animation: blink 1s steps(2, end) infinite; color: var(--accent-bright); }
	@keyframes blink { 50% { opacity: 0; } }
</style>
