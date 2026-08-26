export type TerminalLineType = 'output' | 'success' | 'error';
import { themes } from './themes';

export interface TerminalLine {
	text: string;
	type: TerminalLineType;
}

export interface Profile {
	name: string;
	alias: string;
	role: string;
	location: string;
	email: string;
	github: string;
	summary: string;
	work: string;
	skills: string;
	stack: string;
	architecture: string;
}

export interface CommandDefinition {
	description: string;
	aliases?: string[];
	run: (args: string[], profile: Profile, context?: { setTheme?: (name: string) => boolean }) => TerminalLine[];
}

export const profile: Profile = {
	name: 'Jake Viefhaus',
	alias: 'pwn4g3',
	role: 'full-stack developer and security engineer',
	location: 'St. Louis, USA',
	email: 'geekhaus314@proton.me',
	github: 'github.com/geekhaus314',
	summary: 'I build useful systems for the messy middle: product decisions, infrastructure, automation, and the ways people actually break things.',
	work: 'Production commerce, client platforms, AI infrastructure, reconnaissance tooling, and security research.',
	skills: 'Web, APIs, automation, AI systems, infrastructure, and security engineering.',
	stack: 'React / Next.js / Vue / Nuxt / Solid / Svelte / Astro / TypeScript / Python / Java / Go / Rust / Ruby.',
	architecture: 'Astro owns the public shell. Frameworks own focused surfaces. Rust, Go, and Ruby services share an HTTP health contract.'
};

const line = (text: string, type: TerminalLineType = 'output'): TerminalLine => ({ text, type });

export const commands: Record<string, CommandDefinition> = {
	about: {
		description: 'identity, role, and location',
		aliases: ['whoami', 'identity'],
		run: (_, value) => [line(`${value.name} // ${value.alias} // ${value.role} in ${value.location}.`), line(value.summary)]
	},
	work: {
		description: 'focus areas and selected work',
		run: (_, value) => [line(value.work)]
	},
	skills: {
		description: 'capabilities and engineering focus',
		run: (_, value) => [line(`[+] ${value.skills}`, 'success')]
	},
	stack: {
		description: 'frameworks, languages, and tools',
		run: (_, value) => [line(value.stack)]
	},
	architecture: {
		description: 'how the portfolio system is composed',
		run: (_, value) => [line(value.architecture, 'success')]
	},
	contact: {
		description: 'ways to get in touch',
		run: (_, value) => [line(`${value.email} // ${value.github}`)]
	},
	themes: {
		description: 'list available visual themes',
		run: () => [line(`Themes: ${Object.keys(themes).join(' / ')}`)]
	},
	theme: {
		description: 'switch visual theme: theme <name>',
		run: ([name = ''], _, context) => {
			if (!name) return [line('Usage: theme <nocturne|matrix|cyan|paper>')];
			if (context?.setTheme?.(name)) return [line(`Theme loaded: ${name}. Palette, surfaces, grid, and laser treatment updated.`, 'success')];
			return [line(`Unknown theme: ${name}. Run "themes" to list available themes.`, 'error')];
		}
	}
};

export const helpLines = (): TerminalLine[] => [
	line('Available commands:'),
	...Object.entries(commands).map(([name, command]) => line(`  ${name.padEnd(12)} ${command.description}`)),
	line('  clear        reset the console history')
];
