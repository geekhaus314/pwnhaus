import { useState } from 'react';

const layers = [
	['Astro', 'Public shell', 'SEO, content, routing'],
	['React', 'Product UI', 'Complex client state'],
	['Vue', 'Data surfaces', 'Composable dashboards'],
	['Solid', 'Live systems', 'Low-overhead interactions'],
	['Svelte', 'Motion layer', 'Focused visual effects'],
	['Next.js', 'Application lab', 'Server-rendered React products'],
	['Nuxt', 'Application lab', 'Composable Vue products'],
	['Rust', 'Backend service', 'Fast, explicit systems programming'],
	['Go', 'Backend service', 'Small, concurrent network services'],
	['Ruby', 'Backend service', 'Readable product and automation APIs']
];

export default function ArchitectureMatrix() {
	const [active, setActive] = useState(0);
	const layer = layers[active];

	return (
		<div className="architecture-matrix">
			<div className="architecture-tabs" role="tablist" aria-label="Framework layers">
				{layers.map(([name], index) => (
					<button type="button" role="tab" aria-selected={active === index} className={active === index ? 'active' : ''} onClick={() => setActive(index)}>{name}</button>
				))}
			</div>
			<div className="architecture-detail"><span>{layer[0]}</span><strong>{layer[1]}</strong><p>{layer[2]}</p></div>
		</div>
	);
}
