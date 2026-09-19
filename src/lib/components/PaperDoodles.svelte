<script lang="ts">
	// Composition-notebook marginalia for the Paper theme.
	// Rendered always, visible only under [data-theme='paper'] (see app.css).
	// Pure decoration: hidden from assistive tech, never intercepts clicks.
</script>

<div class="doodles" aria-hidden="true">
	<svg class="doodle doodle-arrow" viewBox="0 0 220 120" fill="none" aria-hidden="true">
		<path
			d="M12 14 C 80 8, 150 22, 178 78 M178 78 l-16 -6 M178 78 l4 -17"
			stroke="#b52b35"
			stroke-width="3"
			stroke-linecap="round"
		/>
		<text x="14" y="52" class="doodle-text" transform="rotate(-6 14 52)">this guy ships!</text>
	</svg>

	<svg class="doodle doodle-star" viewBox="0 0 100 100" fill="none" aria-hidden="true">
		<path
			d="M50 6 L58 38 L92 38 L64 57 L73 90 L50 70 L27 90 L36 57 L8 38 L42 38 Z"
			stroke="#4a7cb2"
			stroke-width="3"
			stroke-linejoin="round"
		/>
	</svg>

	<svg class="doodle doodle-squiggle" viewBox="0 0 200 24" fill="none" aria-hidden="true">
		<path
			d="M4 14 C 30 4, 55 22, 82 12 S 135 4, 160 14 S 188 18, 196 10"
			stroke="#b52b35"
			stroke-width="3"
			stroke-linecap="round"
		/>
	</svg>

	<svg class="doodle doodle-check" viewBox="0 0 120 60" fill="none" aria-hidden="true">
		<path
			d="M10 32 L44 50 L110 8"
			stroke="#1d7a3d"
			stroke-width="5"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<text x="58" y="56" class="doodle-text">hired ✓</text>
	</svg>
</div>

<style>
	.doodles {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 3;
	}
	.doodle { position: absolute; display: none; overflow: visible; }
	.doodle-text {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 19px;
		fill: #b52b35;
	}
	.doodle-arrow { width: 200px; top: -8px; right: 6%; transform: rotate(4deg); }
	.doodle-star { width: 64px; bottom: 4%; left: 2%; transform: rotate(-12deg); }
	.doodle-squiggle { width: 190px; bottom: -6px; right: 12%; transform: rotate(-2deg); }
	.doodle-check { width: 110px; top: 22%; left: -8px; transform: rotate(-10deg); }

	@media (max-width: 960px) {
		.doodle-arrow, .doodle-check { display: none !important; }
	}
</style>
