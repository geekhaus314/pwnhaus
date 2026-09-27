<script lang="ts">
	// Marginalia for the Paper theme — the deranged notebook doodle set.
	// Rendered always, visible only under [data-theme='paper'] (app.css).
	//
	// Two ideas make these read as pen-on-paper rather than clip-art:
	//   1. a feTurbulence displacement filter, so every stroke has a
	//      slightly different wobble instead of perfect bezier geometry;
	//   2. deliberate asymmetry — off-centre placement, uneven rotation,
	//      and scribble-over strokes that overshoot their own bounds.
	// Pure decoration: aria-hidden, pointer-events none, no layout effect.
</script>

<div class="doodles" aria-hidden="true">
	<svg class="defs" aria-hidden="true">
		<filter id="wobble" x="-20%" y="-20%" width="140%" height="140%">
			<feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="7" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
		</filter>
		<filter id="wobble-hard" x="-20%" y="-20%" width="140%" height="140%">
			<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="19" result="n" />
			<feDisplacementMap in="SourceGraphic" in2="n" scale="2" xChannelSelector="R" yChannelSelector="G" />
		</filter>
	</svg>

	<!-- big jagged burst, top right -->
	<svg class="doodle d-burst" viewBox="0 0 200 170" fill="none" aria-hidden="true">
		<g filter="url(#wobble)">
			<path
				d="M100 8 L118 44 L156 24 L150 66 L192 62 L158 92 L188 122 L146 124 L152 166 L114 140 L96 176 L82 136 L42 158 L54 116 L12 108 L52 88 L20 58 L64 58 L58 18 L92 42 Z"
				stroke="#b52b35"
				stroke-width="3.4"
				stroke-linejoin="round"
			/>
			<path
				d="M100 30 L112 58 L142 44 L136 76 L168 72 L142 94 L164 116 L132 116 L136 148 L108 128 L94 156 L84 124 L52 140 L62 108 L28 102 L58 88 L34 64 L68 66 L64 34 L90 52 Z"
				stroke="#b52b35"
				stroke-width="1.6"
				stroke-linejoin="round"
				opacity=".55"
			/>
		</g>
		<text x="100" y="98" class="doodle-text d-burst-text" text-anchor="middle" transform="rotate(-8 100 98)">ughhh</text>
	</svg>

	<!-- struck-through word, mid left -->
	<svg class="doodle d-strike" viewBox="0 0 250 70" fill="none" aria-hidden="true">
		<g filter="url(#wobble)">
			<text x="10" y="42" class="doodle-text d-strike-word">maybe</text>
			<path d="M4 30 C 50 22, 96 40, 140 28 S 214 36, 246 24" stroke="#171717" stroke-width="4.5" stroke-linecap="round" />
			<path d="M2 38 C 56 32, 108 46, 158 36" stroke="#171717" stroke-width="2" stroke-linecap="round" opacity=".7" />
		</g>
	</svg>

	<!-- X eyes + stitched mouth skull, bottom left -->
	<svg class="doodle d-skull" viewBox="0 0 130 140" fill="none" aria-hidden="true">
		<g filter="url(#wobble)" stroke="#171717" stroke-width="3" stroke-linecap="round">
			<path d="M28 62 C 24 24, 106 24, 102 62 C 100 84, 88 92, 88 104 L42 104 C 42 92, 30 84, 28 62 Z" />
			<path d="M46 50 l12 12 M58 50 l-12 12" />
			<path d="M74 50 l12 12 M86 50 l-12 12" />
			<path d="M50 76 l8 6 8 -8 8 8 8 -6" stroke-width="2.4" />
			<path d="M46 104 l10 10 M64 104 l0 10 M82 104 l-10 10" stroke-width="2" />
			<path d="M20 40 l-12 -8 M110 40 l12 -8" stroke-width="2" opacity=".6" />
		</g>
	</svg>

	<!-- spiral, top left -->
	<svg class="doodle d-spiral" viewBox="0 0 100 100" fill="none" aria-hidden="true">
		<path
			d="M50 50 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 1 8 -8 a13 13 0 1 1 -13 13 a19 19 0 1 1 19 -19 a26 26 0 1 1 -26 26 a34 34 0 1 1 34 -34"
			stroke="#171717"
			stroke-width="2.4"
			stroke-linecap="round"
			filter="url(#wobble-hard)"
		/>
	</svg>

	<!-- razor blade + cuts, mid right -->
	<svg class="doodle d-blade" viewBox="0 0 150 90" fill="none" aria-hidden="true">
		<g filter="url(#wobble)" stroke="#171717" stroke-width="2.6" stroke-linecap="round">
			<path d="M46 26 L104 26 L112 46 L46 46 Z" />
			<path d="M52 32 l4 8 M64 32 l4 8 M76 32 l4 8 M88 32 l4 8 M100 32 l4 8" stroke-width="1.4" opacity=".7" />
			<path d="M20 62 C 40 56, 62 68, 86 60" />
			<path d="M26 74 C 48 68, 70 80, 96 72" opacity=".65" />
			<path d="M112 36 l16 4" />
		</g>
	</svg>

	<!-- anarchy-ish sigil, bottom right -->
	<svg class="doodle d-sigil" viewBox="0 0 110 120" fill="none" aria-hidden="true">
		<g filter="url(#wobble)" stroke="#b52b35" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
			<path d="M55 14 L55 106" />
			<path d="M17 40 L93 82" />
			<path d="M93 40 L17 82" />
		</g>
		<circle cx="55" cy="60" r="48" stroke="#b52b35" stroke-width="1.4" opacity=".5" fill="none" filter="url(#wobble-hard)" />
	</svg>

	<!-- lightning + "NO", right edge -->
	<svg class="doodle d-bolt" viewBox="0 0 120 170" fill="none" aria-hidden="true">
		<g filter="url(#wobble)">
			<path d="M64 6 L30 74 L56 74 L40 140 L96 62 L68 62 L88 6 Z" fill="#ffcf3f" stroke="#171717" stroke-width="3" stroke-linejoin="round" />
		</g>
		<text x="60" y="164" class="doodle-text d-bolt-text" text-anchor="middle" transform="rotate(4 60 164)">NO</text>
	</svg>

	<!-- tally marks, bottom centre-left -->
	<svg class="doodle d-tally" viewBox="0 0 190 60" fill="none" aria-hidden="true">
		<g filter="url(#wobble-hard)" stroke="#171717" stroke-width="3" stroke-linecap="round">
			<path d="M14 12 L20 48 M32 10 L26 48 M48 12 L42 48 M64 10 L58 48 M22 30 L60 28 M92 12 L98 48 M110 10 L104 48 M126 12 L120 48 M142 10 L136 48 M100 30 L138 28 M160 14 l8 34" />
		</g>
	</svg>

	<!-- black cloud + drip, top centre -->
	<svg class="doodle d-cloud" viewBox="0 0 170 90" fill="none" aria-hidden="true">
		<g filter="url(#wobble)">
			<path
				d="M28 62 C 10 62, 8 40, 26 36 C 26 20, 50 14, 60 26 C 70 12, 96 16, 100 32 C 118 26, 134 38, 128 52 C 146 54, 146 68, 128 70 L40 70 Z"
				fill="#171717"
			/>
			<path d="M56 72 l2 12 M84 72 l-1 16 M112 70 l3 10" stroke="#171717" stroke-width="4" stroke-linecap="round" />
			<path d="M48 40 l8 8 M72 38 l-8 8 M96 40 l8 8" stroke="#e8e3d8" stroke-width="2.4" stroke-linecap="round" />
		</g>
	</svg>

	<!-- crying eye, left edge -->
	<svg class="doodle d-eye" viewBox="0 0 120 90" fill="none" aria-hidden="true">
		<g filter="url(#wobble)" stroke="#171717" stroke-width="2.8" stroke-linecap="round">
			<path d="M8 44 C 30 18, 84 18, 110 44 C 84 70, 30 70, 8 44 Z" fill="#f7f4ed" />
			<circle cx="58" cy="44" r="15" fill="#171717" />
			<circle cx="53" cy="39" r="5" fill="#f7f4ed" />
			<path d="M58 62 C 56 74, 50 82, 42 86 M66 62 C 70 76, 78 82, 86 84" />
		</g>
	</svg>

	<!-- original set, kept: arrow, star, squiggle, check -->
	<svg class="doodle d-arrow" viewBox="0 0 220 120" fill="none" aria-hidden="true">
		<g filter="url(#wobble)">
			<path
				d="M12 14 C 80 8, 150 22, 178 78 M178 78 l-16 -6 M178 78 l4 -17"
				stroke="#b52b35"
				stroke-width="3"
				stroke-linecap="round"
			/>
		</g>
		<text x="14" y="52" class="doodle-text d-arrow-text" transform="rotate(-6 14 52)">this guy ships!</text>
	</svg>

	<svg class="doodle d-star" viewBox="0 0 100 100" fill="none" aria-hidden="true">
		<path
			d="M50 6 L58 38 L92 38 L64 57 L73 90 L50 70 L27 90 L36 57 L8 38 L42 38 Z"
			stroke="#4a7cb2"
			stroke-width="3"
			stroke-linejoin="round"
			filter="url(#wobble-hard)"
		/>
	</svg>

	<svg class="doodle d-squiggle" viewBox="0 0 200 24" fill="none" aria-hidden="true">
		<path
			d="M4 14 C 30 4, 55 22, 82 12 S 135 4, 160 14 S 188 18, 196 10"
			stroke="#b52b35"
			stroke-width="3"
			stroke-linecap="round"
			filter="url(#wobble)"
		/>
	</svg>

	<svg class="doodle d-check" viewBox="0 0 120 60" fill="none" aria-hidden="true">
		<path
			d="M10 32 L44 50 L110 8"
			stroke="#1d7a3d"
			stroke-width="5"
			stroke-linecap="round"
			stroke-linejoin="round"
			filter="url(#wobble-hard)"
		/>
		<text x="58" y="56" class="doodle-text d-check-text">hired ✓</text>
	</svg>
</div>

<style>
	.doodles {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 3;
	}
	.defs {
		position: absolute;
		width: 0;
		height: 0;
	}
	.doodle {
		position: absolute;
		display: none;
		overflow: visible;
	}
	.doodle-text {
		font-family: 'IBM Plex Mono', ui-monospace, monospace;
		font-weight: 600;
		font-size: 17px;
		fill: #b52b35;
		letter-spacing: 0.04em;
		opacity: 0;
	}

	/* placement — deliberately uneven, nothing lines up on a grid */
	.d-arrow {
		width: 190px;
		top: -6px;
		right: 7%;
		transform: rotate(5deg);
	}
	.d-star {
		width: 54px;
		bottom: 3%;
		left: 3%;
		transform: rotate(-14deg);
	}
	.d-squiggle {
		width: 175px;
		bottom: -4px;
		right: 14%;
		transform: rotate(-3deg);
	}
	.d-check {
		width: 100px;
		top: 20%;
		left: -10px;
		transform: rotate(-11deg);
	}
	.d-burst {
		width: 150px;
		top: 4%;
		right: 24%;
		transform: rotate(9deg);
		opacity: 0.85;
	}
	.d-burst-text {
		font-size: 21px;
		transform-box: fill-box;
	}
	.d-strike {
		width: 175px;
		top: 34%;
		right: 4%;
		transform: rotate(-3deg);
		opacity: 0.8;
	}
	.d-strike-word {
		font-size: 26px;
		fill: #171717;
		text-decoration: line-through;
	}
	.d-skull {
		width: 86px;
		bottom: 16%;
		left: 9%;
		transform: rotate(-6deg);
		opacity: 0.9;
	}
	.d-spiral {
		width: 62px;
		top: 12%;
		left: 14%;
		transform: rotate(12deg);
		opacity: 0.55;
	}
	.d-blade {
		width: 118px;
		bottom: 8%;
		right: 30%;
		transform: rotate(7deg);
		opacity: 0.75;
	}
	.d-sigil {
		width: 74px;
		top: 46%;
		right: 16%;
		transform: rotate(-9deg);
		opacity: 0.8;
	}
	.d-bolt {
		width: 74px;
		top: 26%;
		right: 1%;
		transform: rotate(6deg);
	}
	.d-bolt-text {
		font-size: 19px;
		fill: #171717;
	}
	.d-tally {
		width: 150px;
		bottom: 1%;
		left: 26%;
		transform: rotate(-2deg);
		opacity: 0.6;
	}
	.d-cloud {
		width: 132px;
		top: 26%;
		left: 24%;
		transform: rotate(-3deg);
		opacity: 0.9;
	}
	.d-eye {
		width: 92px;
		top: 56%;
		left: 2%;
		transform: rotate(-8deg);
		opacity: 0.7;
	}

	@media (max-width: 1100px) {
		.d-burst,
		.d-sigil,
		.d-tally {
			display: none !important;
		}
	}
	@media (max-width: 960px) {
		.d-arrow,
		.d-check,
		.d-cloud,
		.d-blade,
		.d-eye {
			display: none !important;
		}
	}
	@media (max-width: 620px) {
		.d-burst,
		.d-sigil,
		.d-tally,
		.d-skull,
		.d-spiral,
		.d-bolt {
			display: none !important;
		}
	}
</style>
