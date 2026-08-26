import { createSignal } from 'solid-js';
import { executeCommand, prompt } from './command-engine';
import type { CliHistoryEntry } from './CliHistory.solid';

export default function CliPrompt(props: { onCommand: (input: string, entries: CliHistoryEntry[]) => void; focusRef: (input: HTMLInputElement) => void; setTheme: (name: string) => boolean }) {
	const [value, setValue] = createSignal('');

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'Enter') return;
		const input = value().trim();
		if (!input) return;

		props.onCommand(input, executeCommand(input, { setTheme: props.setTheme }).map((entry) => ({ ...entry, type: entry.type })));
		setValue('');
	};

	return (
		<label class="cli-prompt">
			<span>{prompt}</span>
			<input
				ref={props.focusRef}
				type="text"
				value={value()}
				onInput={(event) => setValue(event.currentTarget.value)}
				onKeyDown={handleKeyDown}
				aria-label="Enter a pwn4g3 CLI command"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck={false}
			/>
		</label>
	);
}
