export const profile = {
	name: 'Jake Viefhaus',
	alias: 'pwn4g3',
	role: 'Full-Stack Developer · St. Louis, MO',
	location: 'St. Louis, MO',
	email: 'geekhaus314@proton.me',
	github: 'https://github.com/geekhaus314',
	github2: 'https://github.com/3m0h4ck3r',
	gitlab: 'https://gitlab.com/geekhaus314',
	instagram: 'https://www.instagram.com/pwn4g3.io/',
	resumeUrl: '/resume.pdf',
	heroPhoto: '/geekhaus-self-1.jpg',
	summary:
		'I build full-stack web applications, APIs, automation, and secure infrastructure — from e-commerce platforms to bug bounty tooling.',
	about: [
		"I'm Jake, a full-stack developer and cybersecurity engineering student based in St. Louis, Missouri — founder of pwn4g3. I build web applications, automate workflows, and help businesses make sense of their data.",
		'From multi-tenant e-commerce platforms to client sites for local businesses, AI revenue infrastructure to bug bounty tooling — I cover the whole stack: TypeScript, React, Vue, Python, Node, Go, SQL, scraping, APIs, automation, SEO configuration, and firewall/security work.',
		"I'm an optimist at heart — I believe the world can be whole again; I just say it with my eyes on the horizon instead of my mouth."
	],
	facts: [
		{ label: 'Location', value: 'St. Louis, MO' },
		{ label: 'Born', value: 'December 5, 2000' },
		{ label: 'Pronouns', value: 'he/him' },
		{ label: 'Email', value: 'geekhaus314@proton.me' }
	],
	careerGoal:
		'To build a career at the intersection of full-stack development and cybersecurity — engineering secure, reliable web applications and infrastructure, while growing into security engineering and penetration testing. Currently finishing my B.S. in Computer Science / Cybersecurity Engineering (3.9 GPA, Dean\'s List every quarter, two semesters remaining) and open to part-time IT, web development, and security roles.',
	coConspirator: 'Co-conspirator: Thomas Ivie — graphic design, management, booking & customer service'
} as const;

export const capabilities = [
	{
		index: '01',
		title: 'Web Applications',
		description: 'Fast, responsive products built with modern React and Next.js architectures.'
	},
	{
		index: '02',
		title: 'APIs & Backend',
		description: 'Typed APIs, middleware, workers, integrations, databases, and service architecture.'
	},
	{
		index: '03',
		title: 'Automation & AI',
		description: 'Workflow automation and AI-enabled systems designed around real business processes.'
	},
	{
		index: '04',
		title: 'Security Engineering',
		description:
			'Application hardening, reconnaissance tooling, security research, and offensive-security engineering.'
	},
	{
		index: '05',
		title: 'Infrastructure',
		description: 'Cloud deployment, containers, DNS, CI/CD, edge infrastructure, and production operations.'
	},
	{
		index: '06',
		title: 'Technical Redesign',
		description:
			'Rebuilds that improve UX, architecture, maintainability, and technical credibility at once.'
	}
] as const;

export const stack = [
	'React',
	'Next.js',
	'TypeScript',
	'JavaScript',
	'Node.js',
	'Python',
	'Java',
	'Go',
	'Rust',
	'Ruby',
	'Solidity',
	'PostgreSQL',
	'Redis',
	'Docker',
	'Cloudflare',
	'Vercel',
	'Git',
	'Bash',
	'Tailwind',
	'AI / LLM APIs'
] as const;

export const bookingServices = [
	'Full-stack development',
	'API development',
	'Web scraping / data',
	'Automation / scripting',
	'SEO / database configuration',
	'Security / firewall setup',
	'Site redesign / rebuild',
	'Something else'
] as const;
