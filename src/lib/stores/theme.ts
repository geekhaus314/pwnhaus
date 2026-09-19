import { writable } from 'svelte/store';
import { themes } from '$lib/data/themes';

function createThemeStore() {
	const { subscribe, set, update } = writable<string>('nocturne');

	return {
		subscribe,
		update,
		/** Apply a theme by name, returns false if unknown */
		apply(name: string): boolean {
			if (!(name in themes)) return false;
			const def = themes[name as keyof typeof themes];
			set(name);
			if (typeof document !== 'undefined') {
				const root = document.documentElement;
				root.setAttribute('data-theme', name);
				for (const [key, value] of Object.entries(def.variables)) {
					root.style.setProperty(`--${key}`, value);
				}
				// Full-look switch: native controls, scrollbars, and the
				// browser chrome follow the theme's light/dark scheme.
				root.style.colorScheme = def.scheme;
				document.querySelector('meta[name="theme-color"]')?.setAttribute('content', def.variables.page);
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
