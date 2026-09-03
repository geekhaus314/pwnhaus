export interface Project {
	id: string;
	name: string;
	type: string;
	tagline: string;
	stack: string[];
	url?: string;
	repo: string;
	images: string[];
	detail: string[];
}

export const projects: Project[] = [
	{
		id: 'kananos',
		name: 'KananOS / United Distribution',
		type: 'Production',
		tagline: 'Multi-tenant B2B e-commerce wholesale platform',
		stack: ['Next.js', 'TypeScript', 'Vercel'],
		url: 'https://united-distro.vercel.app/united',
		repo: 'https://github.com/geekhaus314/kanan-e',
		images: ['/shots/united-distro.png', '/shots/kananos-home.png', '/shots/kanan-e-checkout.png'],
		detail: [
			'E-commerce infrastructure built for Kanan Enterprises LLC, DBA United Distribution, a wholesale smoke shop distributor in Florissant, MO.',
			'Multi-tenant Next.js architecture supporting branded storefronts (united-distro and kanan-e) with product catalogs, brands, and browse routes.',
			'Production deployment on Vercel with checkout flow, product imagery pipelines, and catalog management.'
		]
	},
	{
		id: 'myhairloss',
		name: 'Brian Ivie Hair — myhairloss.com',
		type: 'Client',
		tagline: 'Client site for a hair loss clinic, live with custom domain',
		stack: ['Next.js', 'MDX', 'Cloudflare Pages'],
		url: 'https://www.myhairloss.com',
		repo: 'https://github.com/geekhaus314/myhairloss-stl',
		images: ['/shots/myhairloss.png', '/shots/brian-home.png', '/shots/brian-services.png', '/shots/brian-shop.png'],
		detail: [
			'Production Next.js site for Brian Ivie Hair, deployed to Cloudflare Pages with custom domains (myhairloss.com, www, admin subdomain).',
			'Service pages, shop section, and admin tooling — maintained and updated continuously.',
			'GitHub-connected auto-deploy pipeline with the Cloudflare Pages integration.'
		]
	},
	{
		id: 'compass',
		name: 'Compass — Psychedelic Trip Journal',
		type: 'Product',
		tagline: 'Private journaling companion for psychedelic experiences',
		stack: ['React', 'Vite', 'JavaScript'],
		repo: 'https://github.com/geekhaus314/Compass-Psychadelic-Trip-Journal',
		images: ['/shots/compass.png'],
		detail: [
			'Vite + React journaling app for documenting psychedelic experiences in a calm, private space.',
			'Clean single-page interface with session entries and reflection-oriented UI.',
			'In active development — interface and deployment in progress.'
		]
	},
	{
		id: 'angie',
		name: 'Angie Viefhaus — Wildlife Photography',
		type: 'Client',
		tagline: 'Photography portfolio for a wildlife photographer',
		stack: ['React', 'TypeScript', 'Tailwind', 'Cloudflare Pages'],
		url: 'https://angie-viefhaus.pages.dev',
		repo: 'https://github.com/geekhaus314/angie-viefhaus',
		images: ['/shots/angie-pages.png'],
		detail: [
			'Full photography portfolio — hero, manifesto, gallery, and lightbox — for a wildlife photographer.',
			'Serif-forward editorial design (Cormorant Garamond) with a dark, gallery-grade presentation.',
			'Deployed to Cloudflare Pages; the same design language powers this portfolio.'
		]
	},
	{
		id: 'agentos',
		name: 'AgentOS — Vertical AI Revenue Infrastructure',
		type: 'Platform',
		tagline: 'Multi-tenant AI revenue workflow platform',
		stack: ['Java', 'Gradle', 'AI Agents'],
		url: 'https://github.com/geekhaus314/agentos',
		repo: 'https://github.com/geekhaus314/agentos',
		images: [],
		detail: [
			'Multi-tenant, vertical AI revenue workflow platform with reusable core infrastructure.',
			'Industry vertical modules (commercial roofing, HVAC, insurance), white-label reseller deployment, configurable workflow engine.',
			'AI agent orchestration with explicit tool authorization and full audit logging for compliance.'
		]
	},
	{
		id: 'proofshelf',
		name: 'ProofShelf — Full-Stack SaaS',
		type: 'SaaS',
		tagline: 'Next.js + Postgres/pgvector + Redis + Clerk',
		stack: ['Next.js', 'PostgreSQL', 'pgvector', 'Redis', 'Clerk'],
		repo: 'https://github.com/geekhaus314',
		images: [],
		detail: [
			'Full-stack SaaS with PostgreSQL + pgvector for semantic search, Redis for caching, Clerk for authentication.',
			'Dockerized API + worker services with monorepo structure (pnpm workspaces).',
			'In-progress — local dev stack fully configured.'
		]
	},
	{
		id: 'nightanvil',
		name: 'NightAnvil — Freelancer Business Toolkit',
		type: 'Automation',
		tagline: 'Fiverr gig generator, invoices, Stripe payments',
		stack: ['Python', 'Flask', 'Stripe', 'PostgreSQL'],
		url: 'https://github.com/3m0h4ck3r/nightanvil',
		repo: 'https://github.com/3m0h4ck3r/nightanvil',
		images: [],
		detail: [
			'Complete Python/Flask toolkit for freelancers: AI-powered gig generation, PDF invoices with payment tracking, Stripe checkout + webhooks.',
			'Fiverr one-click gig sync, auth with secure sessions, dark neon brand UI, GitHub Actions CI/CD.',
			'Deployable to Railway with PostgreSQL + SQLAlchemy.'
		]
	},
	{
		id: 'obsidian',
		name: 'Obsidian Platform — Bug Bounty Intelligence',
		type: 'Security',
		tagline: 'Production-grade Go attack surface management',
		stack: ['Go', 'ASM', 'Recon'],
		url: 'https://github.com/3m0h4ck3r/obsidian-platform',
		repo: 'https://github.com/3m0h4ck3r/obsidian-platform',
		images: [],
		detail: [
			'Production-grade Go attack surface management platform for bug bounty programs.',
			'Hive-mind tier intelligence gathering: automated recon, scope monitoring, and target profiling.'
		]
	},
	{
		id: 'bb-suite',
		name: 'bb-suite — Python Pentest Toolkit',
		type: 'Security',
		tagline: 'Automated bug bounty reconnaissance',
		stack: ['Python', 'CLI'],
		repo: 'https://github.com/geekhaus314',
		images: [],
		detail: [
			'Modular Python toolkit for bug bounty recon with config, data pipelines, and scoped files.',
			'Supports multiple reconnaissance modules with structured output for analysis.'
		]
	},
	{
		id: 'south-city',
		name: 'South City Scooters — Redesign Preview',
		type: 'Client',
		tagline: 'Client site redesign + rebrandable template kit',
		stack: ['Next.js', 'HTML/CSS/JS', 'Tailwind'],
		repo: 'https://github.com/geekhaus314',
		images: [],
		detail: [
			'Next.js redesign for South City Scooters with a companion rebrandable template kit (template-kit).',
			'Static, themed, mobile-first HTML/CSS/JS templates with hero, services, testimonials, and contact sections.',
			'Built to pitch redesigns to potential clients — CSS-variable driven for instant rebranding.'
		]
	},
	{
		id: 'viper',
		name: 'Viper-Web3 + PayloadsAllTheThings',
		type: 'Security',
		tagline: 'Solidity + web security toolkits',
		stack: ['Solidity', 'Python', 'Security'],
		url: 'https://github.com/geekhaus314/Viper-Web3',
		repo: 'https://github.com/geekhaus314/Viper-Web3',
		images: [],
		detail: [
			'Viper-Web3: Solidity bug bounty toolkit for smart contract auditing.',
			'PayloadsAllTheThings fork maintained for web application security testing payloads and bypasses.'
		]
	},
	{
		id: 'vercel-gateway',
		name: 'Vercel AI Gateway Demo',
		type: 'AI',
		tagline: 'AI gateway routing and caching',
		stack: ['TypeScript', 'Vercel', 'AI'],
		url: 'https://github.com/geekhaus314/vercel-ai-gateway-demo',
		repo: 'https://github.com/geekhaus314/vercel-ai-gateway-demo',
		images: [],
		detail: [
			'Demo of AI gateway patterns on Vercel — routing, provider abstraction, and caching for LLM APIs.'
		]
	}
];

export const projectFilters = ['All', 'Production', 'Security', 'Platform', 'SaaS', 'Client', 'Automation', 'AI', 'Product'] as const;
export type ProjectFilter = typeof projectFilters[number];
