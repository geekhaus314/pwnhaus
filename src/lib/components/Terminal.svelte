<script lang="ts">
	import { goto } from '$app/navigation';
	import { themeStore } from '$lib/stores/theme';
	import { profile } from '$lib/data/profile';
	import { themes } from '$lib/data/themes';
	import { GATEWAY_BASE } from '$lib/config';

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
		{ text: `pwn4g3 terminal v3.0 — type "help" for commands`, type: 'output' },
		{ text: `session established${SESSION_DATE ? ` · ${SESSION_DATE}` : ''}`, type: 'success' }
	];

	const PAGES: Record<string, string> = {
		home: '/',
		work: '/work',
		services: '/services',
		shop: '/shop',
		ask: '/ask',
		status: '/status',
		stats: '/stats',
		lab: '/lab',
		about: '/about',
		book: '/book'
	};

	let history = $state<TerminalLine[]>([...BOOT]);
	let input = $state('');
	let inputEl: HTMLInputElement;

	function emit(lines: TerminalLine[]) {
		history = [...history, ...lines];
	}

	async function run(raw: string) {
		const trimmed = raw.trim();
		if (!trimmed) return;

		emit([{ text: `[pwn4g3]$ ${trimmed}`, type: 'input' }]);

		const [cmd, ...args] = trimmed.toLowerCase().split(/\s+/);

		if (cmd === 'clear') {
			history = [...BOOT];
			return;
		}

		if (cmd === 'theme') {
			const name = args[0];
			if (!name) {
				emit([{ text: 'Usage: theme <nocturne|matrix|cyan|paper>', type: 'error' }]);
			} else if (themeStore.apply(name)) {
				try { localStorage.setItem('pwn4g3-theme', name); } catch { /* ignore */ }
				emit([{ text: `Theme loaded: ${name}. Full look swapped — fonts, shapes, textures.`, type: 'success' }]);
			} else {
				emit([{ text: `Unknown theme: ${name}. Run "themes" to list available themes.`, type: 'error' }]);
			}
			return;
		}

		if (cmd === 'goto' || cmd === 'open' || cmd === 'cd') {
			const dest = PAGES[args[0] ?? ''];
			if (!dest) {
				emit([{ text: `Usage: goto <${Object.keys(PAGES).join('|')}>`, type: 'error' }]);
			} else {
				emit([{ text: `→ navigating to ${dest}`, type: 'success' }]);
				await goto(dest);
			}
			return;
		}

		if (cmd === 'status') {
			emit([{ text: 'probing edge signal…', type: 'output' }]);
			try {
				const [health, root] = await Promise.all([
					fetch(`${GATEWAY_BASE}/health`, { cache: 'no-store' }).then((r) => r.json()),
					fetch(`${GATEWAY_BASE}/`, { cache: 'no-store' }).then((r) => r.json())
				]);
				const services = root.architecture ?? 'gateway online';
				emit([
					{ text: `health: ${health.status ?? 'unknown'} · ${health.service ?? 'edge'}`, type: 'success' },
					{ text: `${services}`, type: 'output' }
				]);
			} catch {
				emit([{ text: 'edge unreachable from here — try again, or email me.', type: 'error' }]);
			}
			return;
		}

		if (cmd === 'hire') {
			emit([
				{ text: 'Jake Viefhaus — full-stack developer, St. Louis MO · remote OK.', type: 'output' },
				{ text: 'Fixed scope · 24h response · you own the code · email/text first, Zoom on request.', type: 'output' },
				{ text: `→ /book to start · ${profile.email} · ${profile.phone}`, type: 'success' }
			]);
			return;
		}

		if (cmd === 'sudo') {
			emit([{ text: 'Nice try. This terminal grants exactly one privilege: hiring me. Run "hire".', type: 'error' }]);
			return;
		}

		const handler = {
			whoami: () => [{ text: `${profile.name} // ${profile.alias} // ${profile.role}`, type: 'output' as const }, { text: profile.summary, type: 'output' as const }],
			about: () => [{ text: `${profile.name} // ${profile.alias} // ${profile.role}`, type: 'output' as const }, { text: profile.summary, type: 'output' as const }],
			identity: () => [{ text: `${profile.name} // ${profile.alias} // ${profile.role}`, type: 'output' as const }, { text: profile.summary, type: 'output' as const }],
			work: () => [{ text: 'Production commerce, client platforms, AI infrastructure, reconnaissance tooling, and security research.', type: 'output' as const }],
			skills: () => [{ text: '[+] Web, APIs, automation, AI systems, infrastructure, and security engineering.', type: 'success' as const }],
			stack: () => [{ text: 'JavaScript · TypeScript · React · Svelte · Astro · Vue · Vite · Solid · Node.', type: 'output' as const }],
			contact: () => [{ text: `${profile.email} // ${profile.phone} // github.com/geekhaus314`, type: 'output' as const }],
			themes: () => [{ text: `Themes: ${Object.keys(themes).join(' / ')} — each one restyles the whole site.`, type: 'output' as const }],
			help: () => [
				{ text: 'Available commands:', type: 'output' as const },
				{ text: '  whoami / about / identity — who I am', type: 'output' as const },
				{ text: '  work / skills / stack / contact — the facts', type: 'output' as const },
				{ text: '  goto <home|work|services|shop|lab|about|book> — travel', type: 'output' as const },
				{ text: '  status        — live edge health, straight from the gateway', type: 'output' as const },
				{ text: '  hire          — the pitch in three lines', type: 'output' as const },
				{ text: '  themes / theme <name> — restyle the whole site', type: 'output' as const },
				{ text: '  shop          — shortcut to /shop', type: 'output' as const },
				{ text: '  clear         — reset the console', type: 'output' as const }
			]
		}[cmd];

		if (cmd === 'shop') {
			emit([{ text: '→ opening the shop: fixed prices, embedded checkout.', type: 'success' }]);
			await goto('/shop');
			return;
		}

		if (handler) {
			emit(handler());
		} else {
			emit([{ text: `command not found: ${trimmed}. Try "help".`, type: 'error' as const }]);
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
