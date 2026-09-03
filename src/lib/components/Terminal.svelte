<script lang="ts">
	import { themeStore } from '$lib/stores/theme';
	import { profile } from '$lib/data/profile';
	import { themes } from '$lib/data/themes';

	interface TerminalLine {
		text: string;
		type: 'output' | 'success' | 'error' | 'input';
	}

	const BOOT: TerminalLine[] = [
		{ text: `pwn4g3 terminal v2.0 — type "help" for commands`, type: 'output' },
		{ text: `session established · ${new Date().toISOString().slice(0, 10)}`, type: 'success' }
	];

	let history = $state<TerminalLine[]>([...BOOT]);
	let input = $state('');
	let inputEl: HTMLInputElement;

	const commands: Record<string, () => TerminalLine[]> = {
		whoami: () => [
			{ text: `${profile.name} // ${profile.alias} // ${profile.role}`, type: 'output' },
			{ text: profile.summary, type: 'output' }
		],
		about: () => commands.whoami(),
		identity: () => commands.whoami(),
		work: () => [{ text: 'Production commerce, client platforms, AI infrastructure, reconnaissance tooling, and security research.', type: 'output' }],
		skills: () => [{ text: '[+] Web, APIs, automation, AI systems, infrastructure, and security engineering.', type: 'success' }],
		stack: () => [{ text: 'React / Next.js / Vue / Nuxt / Solid / Svelte / Astro / TypeScript / Python / Java / Go / Rust / Ruby.', type: 'output' }],
		contact: () => [{ text: `${profile.email} // github.com/geekhaus314`, type: 'output' }],
		themes: () => [{ text: `Themes: ${Object.keys(themes).join(' / ')}`, type: 'output' }],
		help: () => [
			{ text: 'Available commands:', type: 'output' },
			{ text: '  whoami / about / identity — who I am', type: 'output' },
			{ text: '  work          — focus areas and selected work', type: 'output' },
			{ text: '  skills        — capabilities and engineering focus', type: 'output' },
			{ text: '  stack         — frameworks, languages, and tools', type: 'output' },
			{ text: '  contact       — ways to get in touch', type: 'output' },
			{ text: '  themes        — list available visual themes', type: 'output' },
			{ text: '  theme <name>  — switch visual theme', type: 'output' },
			{ text: '  clear         — reset the console', type: 'output' }
		]
	};

	function run(raw: string) {
		const trimmed = raw.trim();
		if (!trimmed) return;

		history = [...history, { text: `[pwn4g3]$ ${trimmed}`, type: 'input' }];

		const [cmd, ...args] = trimmed.toLowerCase().split(/\s+/);

		if (cmd === 'clear') {
			history = [...BOOT];
			return;
		}

		if (cmd === 'theme') {
			const name = args[0];
			if (!name) {
				history = [...history, { text: 'Usage: theme <nocturne|matrix|cyan|paper>', type: 'error' }];
			} else if (themeStore.apply(name)) {
				history = [...history, { text: `Theme loaded: ${name}. Palette, surfaces, and laser treatment updated.`, type: 'success' }];
			} else {
				history = [...history, { text: `Unknown theme: ${name}. Run "themes" to list available themes.`, type: 'error' }];
			}
			return;
		}

		const handler = commands[cmd];
		if (handler) {
			history = [...history, ...handler()];
		} else {
			history = [...history, { text: `command not found: ${trimmed}. Try "help".`, type: 'error' }];
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			run(input);
			input = '';
		}
	}

	function focusInput() {
		inputEl?.focus();
	}
</script>

<div
	class="terminal"
	onclick={focusInput}
	onkeydown={(e) => e.key === 'Enter' && focusInput()}
	role="button"
	tabindex="0"
	aria-label="Interactive terminal — click to focus input"
>
	<div class="terminal-bar">
		<span></span><span></span><span></span>
		<b>pwn4g3@terminal</b>
	</div>
	<div class="cli-terminal">
		<div class="cli-history" aria-live="polite" aria-atomic="false">
			{#each history as line}
				<div
					class:cli-line-input={line.type === 'input'}
					class:cli-line-success={line.type === 'success'}
					class:cli-line-error={line.type === 'error'}
				>{line.text}</div>
			{/each}
		</div>
		<div class="cli-prompt">
			<span>[pwn4g3]$</span>
			<input
				bind:this={inputEl}
				bind:value={input}
				onkeydown={onKeydown}
				type="text"
				autocomplete="off"
				autocorrect="off"
				autocapitalize="off"
				spellcheck={false}
				aria-label="Terminal input"
			/>
			<span class="cursor" aria-hidden="true">█</span>
		</div>
	</div>
</div>
