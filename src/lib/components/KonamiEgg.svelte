<script lang="ts">
	/**
	 * Konami easter egg (#83, Sir Pushalot).
	 *
	 * ↑↑↓↓←→←→ B A opens a self-contained "ACCESS GRANTED" overlay:
	 * phosphor rain on canvas, typed reveal, ESC / click / Enter dismisses.
	 * Reduced-motion users get the static card with no rain loop.
	 *
	 * Deliberately outside the theme system — it reads no theme tokens and
	 * writes none, so it can never drift with Nova's palette work. The one
	 * thing it touches is a sessionStorage flag so the egg stays open across
	 * client-side navs until dismissed.
	 */
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	const SEQUENCE = [
		'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
		'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
		'b', 'a'
	];
	const STORAGE_KEY = 'pwn4g3.konami';
	const LINES = [
		'> sequence accepted',
		'> clearance: OPERATOR',
		'> you found the egg. nice fingers.',
		'> — Sir Pushalot, flair dept.'
	];

	let open = $state(false);
	let canvasEl: HTMLCanvasElement | undefined = $state();
	let typed = $state('');
	let overlayEl: HTMLDivElement | undefined = $state();

	let progress = 0;
	let rafId = 0;
	let typeTimer: ReturnType<typeof setInterval> | undefined;
	let drops: number[] = [];

	function onKeydown(e: KeyboardEvent) {
		if (open) {
			if (e.key === 'Escape' || e.key === 'Enter') dismiss();
			return;
		}
		const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
		progress = key === SEQUENCE[progress] ? progress + 1 : key === SEQUENCE[0] ? 1 : 0;
		if (progress === SEQUENCE.length) {
			progress = 0;
			activate();
		}
	}

	function activate() {
		open = true;
		try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* private mode — egg lives for this page only */ }
	}

	export function dismiss() {
		open = false;
		try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
	}

	function startRain() {
		const canvas = canvasEl;
		if (!canvas) return;
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		const cols = Math.floor(canvas.width / 16);
		drops = Array.from({ length: cols }, () => Math.floor(Math.random() * (canvas.height / 16)));
		const glyphs = '01pwn4g3<>/{}$#';

		const frame = () => {
			ctx.fillStyle = 'rgba(3, 7, 5, 0.12)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.font = '15px "IBM Plex Mono", monospace';
			for (let i = 0; i < drops.length; i++) {
				ctx.fillStyle = Math.random() > 0.975 ? '#b8ffd0' : '#4ee082';
				ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * 16, drops[i] * 16);
				drops[i] = drops[i] * 16 > canvas.height && Math.random() > 0.975 ? 0 : drops[i] + 1;
			}
			rafId = requestAnimationFrame(frame);
		};

		if (reduced) {
			// One static frame, no loop.
			ctx.fillStyle = '#030705';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			for (let i = 0; i < cols; i += 2) {
				ctx.fillStyle = '#2a5c3d';
				ctx.font = '15px "IBM Plex Mono", monospace';
				ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * 16, 40 + (i % 7) * 90);
			}
			return;
		}
		frame();
	}

	function startTyping() {
		const full = LINES.join('\n');
		let i = 0;
		typed = '';
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) { typed = full; return; }
		typeTimer = setInterval(() => {
			i += 1;
			typed = full.slice(0, i);
			if (i >= full.length && typeTimer) clearInterval(typeTimer);
		}, 24);
	}

	$effect(() => {
		if (open) {
			// Wait a tick for the canvas to mount.
			requestAnimationFrame(() => {
				startRain();
				startTyping();
				overlayEl?.focus();
			});
		} else {
			if (rafId) cancelAnimationFrame(rafId);
			if (typeTimer) clearInterval(typeTimer);
			rafId = 0;
		}
	});

	onMount(() => {
		try { if (sessionStorage.getItem(STORAGE_KEY) === '1') open = true; } catch { /* ignore */ }
		window.addEventListener('keydown', onKeydown);
	});

	onDestroy(() => {
		// onDestroy runs during SSR teardown too — window only exists client-side.
		if (!browser) return;
		window.removeEventListener('keydown', onKeydown);
		if (rafId) cancelAnimationFrame(rafId);
		if (typeTimer) clearInterval(typeTimer);
	});
</script>

{#if open}
	<div
		class="egg"
		role="dialog"
		aria-modal="true"
		aria-label="Easter egg unlocked"
		tabindex="-1"
		bind:this={overlayEl}
		onclick={dismiss}
		onkeydown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') dismiss(); }}
	>
		<canvas bind:this={canvasEl} aria-hidden="true"></canvas>
		<div class="egg-card">
			<p class="egg-title">[ ACCESS GRANTED ]</p>
			<pre class="egg-lines">{typed}<span class="egg-cursor" aria-hidden="true">█</span></pre>
			<p class="egg-hint">ESC / click to close</p>
		</div>
	</div>
{/if}

<style>
	.egg {
		position: fixed;
		inset: 0;
		z-index: 200;
		cursor: pointer;
		background: #030705;
	}
	.egg canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.egg-card {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		pointer-events: none;
	}
	.egg-title {
		font: 700 clamp(1.4rem, 4vw, 2.4rem) 'IBM Plex Mono', ui-monospace, monospace;
		color: #4ee082;
		letter-spacing: 0.18em;
		margin: 0 0 1.25rem;
		text-shadow: 0 0 22px rgba(78, 224, 130, 0.65);
	}
	.egg-lines {
		font: 0.9rem/1.9 'IBM Plex Mono', ui-monospace, monospace;
		color: #b8ffd0;
		text-align: left;
		display: inline-block;
		margin: 0;
		min-height: 7.6em;
	}
	.egg-cursor { animation: egg-blink 0.9s steps(1) infinite; }
	.egg-hint {
		font: 0.6rem 'IBM Plex Mono', ui-monospace, monospace;
		color: #2a5c3d;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		margin-top: 1.5rem;
	}
	@keyframes egg-blink { 50% { opacity: 0; } }
	@media (prefers-reduced-motion: reduce) {
		.egg-cursor { animation: none; }
	}
</style>
