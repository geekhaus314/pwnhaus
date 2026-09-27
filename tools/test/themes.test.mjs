/**
 * Theme drift guard.
 *
 * The theme system deliberately splits across three files so theming can
 * work without JS:
 *
 *   src/lib/data/themes.ts   registry (names, labels, scheme, swatch colours)
 *   src/app.css              [data-theme] blocks (the actual palette + look)
 *   src/app.html             pre-paint bootstrap allowlist + colour map
 *
 * That split is a real risk: add a theme to the registry and forget the CSS
 * and it silently renders as the default palette. These tests fail instead.
 *
 * Run: node --test tools/test/
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...p) => readFileSync(join(root, ...p), 'utf8');

const registrySrc = read('src', 'lib', 'data', 'themes.ts');
const css = read('src', 'app.css');
const html = read('src', 'app.html');

/** Theme names + their `page` colour, straight out of the registry source. */
function parseRegistry() {
	const start = registrySrc.indexOf('themes: Record<string, ThemeDefinition>');
	assert.notEqual(start, -1, 'could not find the themes registry in themes.ts');
	const body = registrySrc.slice(start);
	const names = [...body.matchAll(/^\t([a-z][\w-]*): \{$/gm)].map((m) => m[1]);
	const pages = {};
	for (const m of body.matchAll(/^\t([a-z][\w-]*): \{[\s\S]*?^\t\tpage: '(#[0-9a-fA-F]{3,8})',$/gm)) {
		pages[m[1]] = m[2].toLowerCase();
	}
	return { names, pages };
}

/** Every `[data-theme='x'] { --a: b; }` block in app.css. */
function parseThemeBlocks() {
	const blocks = {};
	const re = /\[data-theme='([a-z][\w-]*)'\]\s*\{([^}]*)\}/g;
	for (const m of css.matchAll(re)) {
		const vars = [...m[2].matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((v) => v[1]);
		// Only the variable-definition blocks; the structural overrides use
		// selectors and are intentionally not counted here.
		if (vars.length) blocks[m[1]] = new Set(vars);
	}
	return blocks;
}

/**
 * Variables that live in `:root` on purpose and must NOT be per-theme.
 * Each needs a reason, because "it's fine to skip" is how a theme ends up
 * inheriting a default it shouldn't.
 */
const NOT_THEMEABLE = new Map([
	['--font-serif', 'raw serif fallback; themes set --font-heading instead'],
	['--font-sans', 'raw sans fallback; themes set --font-body instead'],
	['--font-mono', 'raw mono fallback; never theme-specific'],
	['--pointer-x', 'written at runtime by the pointer tracker for the grid mask'],
	['--pointer-y', 'written at runtime by the pointer tracker for the grid mask']
]);

const registry = parseRegistry();
const blocks = parseThemeBlocks();

test('registry is non-empty and has a default', () => {
	assert.ok(registry.names.length >= 4, 'expected at least 4 themes');
	assert.ok(registry.names.includes('nocturne'), 'nocturne must exist as the default');
	assert.equal(new Set(registry.names).size, registry.names.length, 'duplicate theme name');
});

test('every registered theme has a [data-theme] block in app.css', () => {
	const missing = registry.names.filter((n) => !blocks[n]);
	assert.deepEqual(missing, [], `themes with no CSS block: ${missing.join(', ')}`);
});

test('no orphaned [data-theme] blocks in app.css', () => {
	const orphans = Object.keys(blocks).filter((n) => !registry.names.includes(n));
	assert.deepEqual(orphans, [], `CSS blocks with no registry entry: ${orphans.join(', ')}`);
});

test('every theme overrides the FULL variable set, not just colours', () => {
	// This is the assertion that stops a "theme" from being a palette swap.
	// :root is the reference set; a theme that omits any of these silently
	// inherits the nocturne value, which is how themes stop feeling distinct.
	const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
	assert.ok(rootMatch, 'could not find :root in app.css');
	const required = [...rootMatch[1].matchAll(/^\s*(--[\w-]+)\s*:/gm)]
		.map((m) => m[1])
		.filter((v) => !NOT_THEMEABLE.has(v));
	assert.ok(required.length > 20, `:root only declared ${required.length} themeable variables`);

	// The exclusion list must not rot: a variable removed from :root should
	// also be removed here, and a typo should fail loudly.
	for (const v of NOT_THEMEABLE.keys()) {
		assert.ok(
			rootMatch[1].includes(`${v}:`),
			`${v} is excluded from theming but no longer exists in :root — drop the exclusion`
		);
	}

	for (const name of registry.names) {
		const missing = required.filter((v) => !blocks[name]?.has(v));
		assert.deepEqual(
			missing,
			[],
			`theme "${name}" is missing ${missing.length} variable(s): ${missing.join(', ')}`
		);
	}
});

test('themes actually differ from each other', () => {
	// A theme that redeclares the identical palette is a copy-paste, not a look.
	const body = css;
	for (const name of registry.names) {
		const re = new RegExp(`\\[data-theme='${name}'\\]\\s*\\{([^}]*)\\}`);
		const m = body.match(re);
		assert.ok(m, `no block for ${name}`);
		const accent = m[1].match(/--accent:\s*([^;]+);/)?.[1]?.trim();
		assert.ok(accent, `${name} has no --accent`);
	}
	const accents = registry.names.map((n) => {
		const m = css.match(new RegExp(`\\[data-theme='${n}'\\]\\s*\\{([^}]*)\\}`));
		return m?.[1].match(/--accent:\s*([^;]+);/)?.[1]?.trim();
	});
	assert.equal(new Set(accents).size, accents.length, `duplicate accents: ${accents.join(' ')}`);
});

test('no dead tokens in :root', () => {
	// A variable nothing reads is a lie about the design system: it looks
	// like a knob, so someone themes against it and nothing happens. This
	// caught three (`--display-weight`, `--laser`, `--surface`) that had
	// been defined in every theme and consumed by nothing.
	const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
	assert.ok(rootMatch, 'could not find :root in app.css');
	const defined = [...rootMatch[1].matchAll(/^\t(--[\w-]+)\s*:/gm)].map((m) => m[1]);
	const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));

	// `--pointer-x/y` are written at runtime by the pointer tracker, never
	// read through var() in this file.
	const RUNTIME_WRITTEN = new Set(['--pointer-x', '--pointer-y']);
	const dead = defined.filter((v) => !used.has(v) && !RUNTIME_WRITTEN.has(v));
	assert.deepEqual(dead, [], `declared in :root but never used: ${dead.join(', ')}`);
});

test('structural tokens are actually consumed, not just declared', () => {
	// The specific failure this whole file exists to prevent: a theme system
	// where the "look" tokens are declared per theme but no rule reads them,
	// so every theme collapses to a palette swap. Each of these must appear
	// at least once inside a var() in the consuming stylesheet.
	const structural = [
		'--border-w',
		'--radius',
		'--card-shadow',
		'--card-blur',
		'--label-transform',
		'--label-tracking',
		'--title-transform',
		'--title-weight',
		'--rule-style',
		'--tick',
		'--heading-spacing',
		'--heading-style'
	];
	const used = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
	const unconsumed = structural.filter((v) => !used.has(v));
	assert.deepEqual(
		unconsumed,
		[],
		`declared but never read — the theme would be a palette swap: ${unconsumed.join(', ')}`
	);
});

test('pre-paint bootstrap allowlist matches the registry', () => {
	const script = html.match(/var THEMES = \{([\s\S]*?)\};/);
	assert.ok(script, 'could not find the THEMES map in app.html');
	const keys = [...script[1].matchAll(/([a-z][\w-]*):\s*'#/g)].map((m) => m[1]);
	assert.deepEqual(
		keys.sort(),
		[...registry.names].sort(),
		'themes.ts and the app.html bootstrap disagree — a saved theme would be silently dropped'
	);
});

test('bootstrap colours match the registry page colours', () => {
	const script = html.match(/var THEMES = \{([\s\S]*?)\};/);
	assert.ok(script);
	for (const m of script[1].matchAll(/([a-z][\w-]*):\s*'(#[0-9a-fA-F]{3,8})'/g)) {
		const [, name, colour] = m;
		assert.equal(
			colour.toLowerCase(),
			registry.pages[name],
			`bootstrap colour for "${name}" (${colour}) != themes.ts page (${registry.pages[name]})`
		);
	}
});

test('storage key is defined once and used by both consumers', () => {
	const dataKey = registrySrc.match(/THEME_STORAGE_KEY = '([^']+)'/)?.[1];
	assert.ok(dataKey, 'could not read THEME_STORAGE_KEY from themes.ts');

	// The store must import it rather than re-declaring the literal, or the
	// two can drift and writes land under a different key than reads.
	const storeSrc = read('src', 'lib', 'stores', 'theme.ts');
	assert.ok(
		/import \{[^}]*THEME_STORAGE_KEY[^}]*\} from '\$lib\/data\/themes'/.test(storeSrc),
		'theme.ts must import THEME_STORAGE_KEY from themes.ts, not redeclare it'
	);

	assert.ok(html.includes(`'${dataKey}'`), 'app.html bootstrap uses a different storage key');
});

test('no theme block hardcodes a palette colour outside variables', () => {
	// Structural overrides should reference vars, not literals, or the theme
	// stops being themeable from one place.
	const offenders = [];
	const re = /\[data-theme='([a-z][\w-]*)'\][^{]*\{([^}]*)\}/g;
	for (const m of css.matchAll(re)) {
		if (!/^\s*--/.test(m[2].split('\n')[0] ?? '')) continue;
		const literals = m[2].match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
		// One literal per theme is expected: color-scheme is a keyword, but
		// some tokens embed a hex inside a gradient.
		if (literals.length > 0) offenders.push(`${m[1]}: ${literals.join(', ')}`);
	}
	assert.deepEqual(offenders, [], `literal colours in theme variable blocks: ${offenders.join(' | ')}`);
});
