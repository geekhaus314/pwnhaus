import { writable } from 'svelte/store';
import { themes, type ThemeDefinition } from '$lib/data/themes';

function createThemeStore() {
	const { subscribe, set, update } = writable<string>('nocturne');

	return {
		subscribe,
		/** Apply a theme by name, returns false if unknown */
		apply(name: string): boolean {
			if (!(name in themes)) return false;
			set(name);
			if (typeof document !== 'undefined') {
				const def: ThemeDefinition = themes[name as keyof typeof themes];
				const root = document.documentElement;
				root.setAttribute('data-theme', name);
				for (const [key, value] of Object.entries(def.variables)) {
					root.style.setProperty(`--${key}`, value);
				}
			}
			return true;
		},
		/** List available theme names */
		list(): string[] {
			return Object.keys(themes);
		}
	};
}

export const themeStore = createThemeStore();
