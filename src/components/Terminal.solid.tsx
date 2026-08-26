import { createSignal, onMount } from 'solid-js';
import CliHistory, { type CliHistoryEntry } from './cli/CliHistory.solid';
import CliPrompt from './cli/CliPrompt.solid';
import { prompt } from './cli/command-engine';
import { themes } from '../data/themes';

const initialEntries: CliHistoryEntry[] = [
	{ text: 'pwn4g3 // software + security engineering', type: 'success' },
	{ text: 'Type "help" to inspect the operator profile.', type: 'output' }
];

export default function Terminal() {
	const [entries, setEntries] = createSignal<CliHistoryEntry[]>(initialEntries);
	let inputRef: HTMLInputElement | undefined;

	onMount(() => inputRef?.focus());

	const appendCommand = (input: string, output: CliHistoryEntry[]) => {
		if (input.toLowerCase() === 'clear') {
			setEntries([]);
			return;
		}
		setEntries((current) => [...current, { text: `${prompt} ${input}`, type: 'input' }, ...output]);
	};

	const setTheme = (name: string) => {
		const theme = themes[name];
		if (!theme) return false;
		window.dispatchEvent(new CustomEvent('portfolio-theme', { detail: name }));
		return true;
	};

	return (
		<div class="cli-terminal" onClick={() => inputRef?.focus()}>
			<CliHistory entries={entries} />
			<CliPrompt onCommand={appendCommand} focusRef={(input) => (inputRef = input)} setTheme={setTheme} />
		</div>
	);
}
