<script lang="ts">
	import { themeStore } from '$lib/stores/theme';
	import { profile } from '$lib/data/profile';
	import { themes } from '$lib/data/themes';

	interface TerminalLine {
		text: string;
		type: 'output' | 'success' | 'error' | 'input';
	}

	// Stable across SSR + hydration: derived from a build-time constant inlined
	// identically into both the prerendered HTML and the client bundle. A live
	// `new Date()` here would differ from the prerendered value on later visits
	// and abort Svelte hydration — leaving the whole page hidden until JS ran.
	const SESSION_DATE = (import.meta.env.VITE_BUILD_TIME ?? '').slice(0, 10);

	const BOOT: TerminalLine[] = [
		{ text: `pwn4g3 terminal v2.0 — type "help" for commands`, type: 'output' },
		{ text: `session established${SESSION_DATE ? ` · ${SESSION_DATE}` : ''}`, type: 'success' }
	];

	let history = $state<TerminalLine[]>([...BOOT]);
	let input = $state('');
	let inputEl: HTMLInputElement;

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
				try { localStorage.setItem('pwn4g3-theme', name); } catch { /* ignore */ }
				history = [...history, { text: `Theme loaded: ${name}. Palette, surfaces, and laser treatment updated.`, type: 'success' }];
			} else {
				history = [...history, { text: `Unknown theme: ${name}. Run "themes" to list available themes.`, type: 'error' }];
			}
			return;
		}

	const handler = {
		whoami: () => [{ text: `${profile.name} // ${profile.alias} // ${profile.role}`, type: 'output' as const }, { text: profile.summary, type: 'output' as const }],
		about: () => [{ text: `${profile.name} // ${profile.alias} // ${profile.role}`, type: 'output' as const }, { text: profile.summary, type: 'output' as const }],
		identity: () => [{ text: `${profile.name} // ${profile.alias} // ${profile.role}`, type: 'output' as const }, { text: profile.summary, type: 'output' as const }],
		work: () => [{ text: 'Production commerce, client platforms, AI infrastructure, reconnaissance tooling, and security research.', type: 'output' as const }],
		skills: () => [{ text: '[+] Web, APIs, automation, AI systems, infrastructure, and security engineering.', type: 'success' as const }],
		stack: () => [{ text: 'SvelteKit · Svelte 5 · Cloudflare Pages · Workers · TypeScript · Go · Python · Rust.', type: 'output' as const }],
		contact: () => [{ text: `${profile.email} // github.com/geekhaus314`, type: 'output' as const }],
		themes: () => [{ text: `Themes: ${Object.keys(themes).join(' / ')}`, type: 'output' as const }],
		help: () => [
			{ text: 'Available commands:', type: 'output' as const },
			{ text: '  whoami / about / identity — who I am', type: 'output' as const },
			{ text: '  work          — focus areas and selected work', type: 'output' as const },
			{ text: '  skills        — capabilities and engineering focus', type: 'output' as const },
			{ text: '  stack         — frameworks, languages, and tools', type: 'output' as const },
			{ text: '  contact       — ways to get in touch', type: 'output' as const },
			{ text: '  themes        — list available visual themes', type: 'output' as const },
			{ text: '  theme <name>  — switch visual theme (persisted)', type: 'output' as const },
			{ text: '  clear         — reset the console', type: 'output' as const }
		]
	}[cmd];

	if (handler) {
		history = [...history, ...handler()];
	} else {
		history = [...history, { text: `command not found: ${trimmed}. Try "help".`, type: 'error' as const }];
	}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			run(input);
			input = '';
		}
	}
</script>

<div class="terminal">
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