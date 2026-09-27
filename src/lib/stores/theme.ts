import { writable } from 'svelte/store';
import { themes, DEFAULT_THEME, THEME_STORAGE_KEY, isThemeName } from '$lib/data/themes';

/**
 * Theme store.
 *
 * The switch is a single `data-theme` attribute write on <html>. All the
 * palette and look tokens live in `app.css` as `[data-theme='…']` blocks,
 * so a theme change is a style recalculation rather than 25
 * `setProperty` calls — and a saved theme renders correctly before any
 * JavaScript runs (see the inline bootstrap in `app.html`).
 */

const canUseDom = typeof document !== 'undefined';

/**
 * Start from whatever the pre-paint bootstrap already put on <html>.
 * On the server that's the hardcoded default; in the browser it's the
 * restored value, so the store is correct at hydration time and Svelte
 * never reconciles a mismatch.
 */
const initialTheme = (): string => {
	if (!canUseDom) return DEFAULT_THEME;
	const attr = document.documentElement.getAttribute('data-theme');
	return isThemeName(attr) ? attr : DEFAULT_THEME;
};

const paintChrome = (name: string): void => {
	if (!canUseDom) return;
	const def = themes[name];
	// `color-scheme` is a CSS rule per theme; the meta tag is not.
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute('content', def?.page ?? themes[DEFAULT_THEME].page);
};

function createThemeStore() {
	const { subscribe, set, update } = writable<string>(initialTheme());

	if (canUseDom) {
		paintChrome(initialTheme());
		// Two tabs open, theme changed in one: follow along.
		window.addEventListener('storage', (e) => {
			if (e.key !== THEME_STORAGE_KEY || !isThemeName(e.newValue)) return;
			document.documentElement.setAttribute('data-theme', e.newValue);
			paintChrome(e.newValue);
			set(e.newValue);
		});
	}

	return {
		subscribe,
		update,
		/** Apply a theme by name. Returns false for an unknown name. */
		apply(name: string): boolean {
			if (!isThemeName(name)) return false;
			if (canUseDom) {
				document.documentElement.setAttribute('data-theme', name);
				paintChrome(name);
				try {
					localStorage.setItem(THEME_STORAGE_KEY, name);
				} catch {
					// Storage disabled (private mode, blocked cookies). The theme
					// still applies for this page view; it just won't persist.
				}
			}
			set(name);
			return true;
		},
		/** Cycle to the next theme — keyboard shortcut in the layout. */
		cycle(): string {
			const order = Object.keys(themes);
			let index = 0;
			const unsubscribe = subscribe((v) => {
				const at = order.indexOf(v);
				if (at !== -1) index = at;
			});
			unsubscribe();
			const next = order[(index + 1) % order.length] as string;
			this.apply(next);
			return next;
		},
		list(): string[] {
			return Object.keys(themes);
		}
	};
}

export const themeStore = createThemeStore();
