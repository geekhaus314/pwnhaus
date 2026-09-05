<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { themeStore } from '$lib/stores/theme';
	import { themes } from '$lib/data/themes';

	let canvasEl: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let rafId: number;
	let mouse = { x: 0, y: 0, active: false };

	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		alpha: number;
	}
	let particles: Particle[] = [];

	// Derive grid color from current theme
	let accentHex = $state('#a51d37');
	const unsubscribe = themeStore.subscribe((name) => {
		const def = themes[name as keyof typeof themes];
		accentHex = def?.variables.accent ?? '#a51d37';
	});

	function traceColor(alpha: number): string {
		return `${accentHex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
	}

	function onMouseMove(e: MouseEvent) {
		const rect = canvasEl.getBoundingClientRect();
		mouse.x = e.clientX - rect.left;
		mouse.y = e.clientY - rect.top;
		mouse.active = true;
		if (particles.length < 60 && Math.random() > 0.4) {
			particles.push({
				x: mouse.x,
				y: mouse.y,
				vx: (Math.random() - 0.5) * 1.5,
				vy: (Math.random() - 0.5) * 1.5,
				alpha: 1.0
			});
		}
	}

	function onMouseLeave() {
		mouse.active = false;
	}

	function draw() {
		if (!canvasEl || !ctx) return;
		ctx.fillStyle = 'rgba(13, 14, 21, 0.15)';
		ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

		if (mouse.active) {
			ctx.strokeStyle = traceColor(0.35);
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, mouse.y);
			ctx.lineTo(canvasEl.width, mouse.y);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(mouse.x, 0);
			ctx.lineTo(mouse.x, canvasEl.height);
			ctx.stroke();
		}

		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.x += p.vx;
			p.y += p.vy;
			p.alpha -= 0.015;
			if (p.alpha <= 0) { particles.splice(i, 1); continue; }
			ctx.fillStyle = traceColor(p.alpha);
			ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
		}

		rafId = requestAnimationFrame(draw);
	}

	function resize() {
		if (!canvasEl) return;
		canvasEl.width = window.innerWidth;
		canvasEl.height = 260;
	}

	onMount(() => {
		ctx = canvasEl.getContext('2d')!;
		resize();
		window.addEventListener('resize', resize);
		draw();
		return () => {
			window.removeEventListener('resize', resize);
			if (rafId) cancelAnimationFrame(rafId);
		};
	});

	onDestroy(() => {
		unsubscribe();
	});
</script>

<div class="canvas-wrapper">
	<canvas
		bind:this={canvasEl}
		onmousemove={onMouseMove}
		onmouseleave={onMouseLeave}
		aria-hidden="true"
	></canvas>
	<div class="overlay" aria-hidden="true">
		<h1>PWN4G3 // PORTFOLIO</h1>
		<p>SECURE APPLICATION RUNTIME LABS</p>
	</div>
</div>

<style>
	.canvas-wrapper {
		position: relative;
		width: 100%;
		background-color: #0d0e15;
		border-bottom: 1px solid #1f2438;
		overflow: hidden;
	}
	canvas {
		display: block;
		cursor: crosshair;
	}
	.overlay {
		position: absolute;
		top: 50%;
		left: 5%;
		transform: translateY(-50%);
		pointer-events: none;
		font-family: 'Courier New', Courier, monospace;
	}
	h1 {
		margin: 0;
		font-size: 2.2rem;
		color: #e2e8f0;
		letter-spacing: 4px;
	}
	p {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		color: #4ee082;
		letter-spacing: 2px;
	}
</style>
