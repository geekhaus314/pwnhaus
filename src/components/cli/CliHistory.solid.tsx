import { For } from 'solid-js';
import type { TerminalLine } from '../../data/profile';

export interface CliHistoryEntry extends TerminalLine {
	type: 'input' | TerminalLine['type'];
}

export default function CliHistory(props: { entries: () => CliHistoryEntry[] }) {
	return (
		<div class="cli-history" role="log" aria-live="polite">
			<For each={props.entries()}>
				{(entry) => <div class={`cli-line cli-line-${entry.type}`}>{entry.text}</div>}
			</For>
		</div>
	);
}
