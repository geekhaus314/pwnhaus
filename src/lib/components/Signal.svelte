<script lang="ts">
	let active = $state(true);
</script>

<button
	class="signal"
	type="button"
	aria-pressed={active}
	onclick={() => (active = !active)}
>
	<span class="dot" class:active></span>
	<span>{active ? 'EDGE SIGNAL NOMINAL' : 'SIGNAL PAUSED'}</span>
</button>
