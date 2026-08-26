export interface ThemeDefinition {
	label: string;
	description: string;
	variables: Record<string, string>;
}

export const themes: Record<string, ThemeDefinition> = {
	nocturne: {
		label: 'Nocturne',
		description: 'deep graphite, signal crimson, and editorial contrast',
		variables: {
			'accent': '#a51d37', 'accent-bright': '#e33d5c', 'accent-soft': 'rgba(165,29,55,.2)',
			'page': '#050608', 'surface': '#080a0d', 'surface-raised': '#0b0d10',
			'ink': '#ece7e0', 'muted': '#898681', 'grid': 'rgba(165,29,55,.18)',
			'laser': 'rgba(227,61,92,.9)', 'shadow': 'rgba(0,0,0,.7)', 'selection': '#a51d37'
		}
	},
	matrix: {
		label: 'Matrix',
		description: 'phosphor green, black glass, and diagnostic scanlines',
		variables: {
			'accent': '#35d07f', 'accent-bright': '#8affb8', 'accent-soft': 'rgba(53,208,127,.2)',
			'page': '#030705', 'surface': '#07100b', 'surface-raised': '#0a160f',
			'ink': '#e1f7e9', 'muted': '#85a792', 'grid': 'rgba(53,208,127,.2)',
			'laser': 'rgba(138,255,184,.9)', 'shadow': 'rgba(0,20,10,.75)', 'selection': '#16834a'
		}
	},
	cyan: {
		label: 'Cyan Field',
		description: 'cold blue light, technical glass, and high-visibility edges',
		variables: {
			'accent': '#16b7d8', 'accent-bright': '#73edff', 'accent-soft': 'rgba(22,183,216,.2)',
			'page': '#04080b', 'surface': '#071117', 'surface-raised': '#0b1820',
			'ink': '#e5f9fc', 'muted': '#82aab1', 'grid': 'rgba(22,183,216,.2)',
			'laser': 'rgba(115,237,255,.9)', 'shadow': 'rgba(0,15,25,.75)', 'selection': '#087f9a'
		}
	},
	paper: {
		label: 'Paper',
		description: 'warm off-white, ink black, and red annotation marks',
		variables: {
			'accent': '#b52b35', 'accent-bright': '#e35b5f', 'accent-soft': 'rgba(181,43,53,.16)',
			'page': '#e8e3d8', 'surface': '#f0ece3', 'surface-raised': '#f7f4ed',
			'ink': '#171717', 'muted': '#5e5b55', 'grid': 'rgba(23,23,23,.14)',
			'laser': 'rgba(181,43,53,.85)', 'shadow': 'rgba(30,25,15,.2)', 'selection': '#b52b35'
		}
	}
};
