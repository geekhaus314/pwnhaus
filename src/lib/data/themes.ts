export interface ThemeDefinition {
	label: string;
	description: string;
	/** 'dark' | 'light' — applied to color-scheme + theme-color meta */
	scheme: 'dark' | 'light';
	variables: Record<string, string>;
}

export const themes: Record<string, ThemeDefinition> = {
	nocturne: {
		label: 'Nocturne',
		description: 'Editorial dark — serif display, crimson signal, soft pills',
		scheme: 'dark',
		variables: {
			accent: '#a51d37',
			'accent-bright': '#e33d5c',
			'accent-soft': 'rgba(165,29,55,.2)',
			page: '#050608',
			surface: '#080a0d',
			'surface-raised': '#0b0d10',
			ink: '#ece7e0',
			muted: '#898681',
			grid: 'rgba(165,29,55,.18)',
			laser: 'rgba(227,61,92,.9)',
			shadow: 'rgba(0,0,0,.7)',
			selection: '#a51d37',
			ok: '#35d07f',
			warn: '#e5a63d',
			crit: '#e5484d',
			line: 'rgba(236,231,224,.09)',
			card: '#0b0d10',
			// look — sans display + serif section heads, soft pills
			'font-heading': "'Cormorant Garamond', Georgia, serif",
			'font-body': 'Inter, system-ui, sans-serif',
			'heading-case': 'none',
			'heading-spacing': '-0.03em',
			'heading-style': 'italic',
			'font-display': 'Inter, system-ui, sans-serif',
			'display-weight': '800',
			radius: '14px',
			'radius-sm': '9px'
		}
	},
	matrix: {
		label: 'Matrix',
		description: 'Terminal mode — full mono, sharp corners, scanlines',
		scheme: 'dark',
		variables: {
			accent: '#35d07f',
			'accent-bright': '#8affb8',
			'accent-soft': 'rgba(53,208,127,.2)',
			page: '#030705',
			surface: '#07100b',
			'surface-raised': '#0a160f',
			ink: '#e1f7e9',
			muted: '#85a792',
			grid: 'rgba(53,208,127,.2)',
			laser: 'rgba(138,255,184,.9)',
			shadow: 'rgba(0,20,10,.75)',
			selection: '#16834a',
			ok: '#35d07f',
			warn: '#e5c53d',
			crit: '#ff5f56',
			line: 'rgba(225,247,233,.1)',
			card: '#081009',
			// look — everything monospace, uppercase, razor corners
			'font-heading': "'IBM Plex Mono', ui-monospace, monospace",
			'font-body': "'IBM Plex Mono', ui-monospace, monospace",
			'heading-case': 'uppercase',
			'heading-spacing': '0.04em',
			'heading-style': 'normal',
			'font-display': "'IBM Plex Mono', ui-monospace, monospace",
			'display-weight': '700',
			radius: '3px',
			'radius-sm': '2px'
		}
	},
	cyan: {
		label: 'Cyan Field',
		description: 'Glass console — geometric sans, soft bubbles, glow',
		scheme: 'dark',
		variables: {
			accent: '#16b7d8',
			'accent-bright': '#73edff',
			'accent-soft': 'rgba(22,183,216,.2)',
			page: '#04080b',
			surface: '#071117',
			'surface-raised': '#0b1820',
			ink: '#e5f9fc',
			muted: '#82aab1',
			grid: 'rgba(22,183,216,.2)',
			laser: 'rgba(115,237,255,.9)',
			shadow: 'rgba(0,15,25,.75)',
			selection: '#087f9a',
			ok: '#3ddc84',
			warn: '#f0b429',
			crit: '#ff5f56',
			line: 'rgba(229,249,252,.1)',
			card: '#08121a',
			// look — geometric sans display, extra-soft glass bubbles
			'font-heading': 'Inter, system-ui, sans-serif',
			'font-body': 'Inter, system-ui, sans-serif',
			'heading-case': 'none',
			'heading-spacing': '-0.045em',
			'heading-style': 'normal',
			'font-display': 'Inter, system-ui, sans-serif',
			'display-weight': '800',
			radius: '22px',
			'radius-sm': '14px'
		}
	},
	paper: {
		label: 'Paper',
		description: 'Composition notebook — ruled blue lines, red margin, torn tape, doodles',
		scheme: 'light',
		variables: {
			accent: '#b52b35',
			'accent-bright': '#8f1d27',
			'accent-soft': 'rgba(181,43,53,.16)',
			page: '#e8e3d8',
			surface: '#f0ece3',
			'surface-raised': '#f7f4ed',
			ink: '#171717',
			muted: '#5e5b55',
			grid: 'rgba(23,23,23,.14)',
			laser: 'rgba(181,43,53,.85)',
			shadow: 'rgba(30,25,15,.2)',
			selection: '#b52b35',
			ok: '#1d7a3d',
			warn: '#a96a12',
			crit: '#c22f36',
			line: 'rgba(23,23,23,.12)',
			card: '#f2eee5',
			// look — print serif, sharp ink corners
			'font-heading': "'Cormorant Garamond', Georgia, serif",
			'font-body': "'Cormorant Garamond', Georgia, serif",
			'heading-case': 'none',
			'heading-spacing': '-0.01em',
			'heading-style': 'normal',
			'font-display': "'Cormorant Garamond', Georgia, serif",
			'display-weight': '600',
			radius: '2px',
			'radius-sm': '2px'
		}
	}
};

export const themeNames = Object.keys(themes) as Array<keyof typeof themes>;
