import { createSignal } from 'solid-js';

export default function LiveStatus() {
	const [online, setOnline] = createSignal(true);
	return (
		<button type="button" class="live-status" onClick={() => setOnline((value) => !value)} aria-pressed={online()}>
			<i class={online() ? 'online' : ''}></i>
			{online() ? 'SYSTEMS ONLINE' : 'MAINTENANCE MODE'}
		</button>
	);
}
