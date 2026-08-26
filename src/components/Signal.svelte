<script lang="ts">
	let active = true;
</script>

<button class="signal" type="button" aria-pressed={active} onclick={() => (active = !active)}>
	<span class:active></span>
	<span>{active ? 'EDGE SIGNAL NOMINAL' : 'SIGNAL PAUSED'}</span>
</button>
