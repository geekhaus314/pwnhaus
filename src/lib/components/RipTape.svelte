<script lang="ts">
	// Torn masking-tape strip for the Paper theme (see app.css).
	// Rendered always, visible only under [data-theme='paper'].
	let { text = 'available for hire!' }: { text?: string } = $props();
</script>

<div class="rip-wrap reveal" aria-hidden="true">
	<div class="rip-tape"><span>★</span> {text} <span>★</span></div>
</div>
