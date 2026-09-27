/**
 * Theme registry.
 *
 * SCOPE: this file owns theme *identity* — name, label, description,
 * light/dark scheme, and the two colours the UI itself needs (the
 * switcher swatch and the browser chrome colour).
 *
 * It deliberately does NOT own the palette or the look tokens. Those live
 * in `src/app.css` as `[data-theme='<name>']` blocks, because:
 *
 *  - CSS has to own them anyway. Applying variables from JS meant a
 *    restored theme only existed *after* hydration, which flashed the
 *    default palette on every load.
 *  - The whole theme then switches from one attribute write, so it works
 *    with JS disabled and costs nothing at runtime.
 *
 * `tools/test/themes.test.mjs` asserts every name here has a matching CSS
 * block and that the pre-paint bootstrap allowlist in `src/app.html`
 * matches `themeNames`. Add a theme to both places or that test fails.
 */

export interface ThemeDefinition {
	label: string;
	description: string;
	/** Drives the `color-scheme` CSS rule per theme. */
	scheme: 'dark' | 'light';
	/** Page background — used for the switcher swatch ring + theme-color meta. */
	page: string;
	/** Accent — used for the switcher swatch dot. */
	accent: string;
}

export const DEFAULT_THEME = 'nocturne';

/** localStorage key. Bump the suffix to invalidate stale saved choices. */
export const THEME_STORAGE_KEY = 'pwn4g3.theme';

export const themes: Record<string, ThemeDefinition> = {
	nocturne: {
		label: 'Nocturne',
		description: 'Editorial dark — hairline rules, soft glow, italic serif heads',
		scheme: 'dark',
		page: '#050608',
		accent: '#a51d37'
	},
	matrix: {
		label: 'Matrix',
		description: 'Terminal — hard green, blocky borders, scanlines, all caps',
		scheme: 'dark',
		page: '#030705',
		accent: '#35d07f'
	},
	cyan: {
		label: 'Cyan Field',
		description: 'Glass console — frosted panels, huge radii, ambient wash',
		scheme: 'dark',
		page: '#04080b',
		accent: '#16b7d8'
	},
	paper: {
		label: 'Paper',
		description: 'Composition notebook — ruled lines, red margin, hard shadows, doodles',
		scheme: 'light',
		page: '#e8e3d8',
		accent: '#b52b35'
	},
	blueprint: {
		label: 'Blueprint',
		description: 'Drafting table — navy ground, dashed rules, mono, corner ticks',
		scheme: 'dark',
		page: '#061a2e',
		accent: '#7cc4ff'
	}
};

export const themeNames = Object.keys(themes) as Array<keyof typeof themes>;

export const isThemeName = (value: unknown): value is keyof typeof themes =>
	typeof value === 'string' && Object.prototype.hasOwnProperty.call(themes, value);
