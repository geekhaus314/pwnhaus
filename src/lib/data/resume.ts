/**
 * Resume content, rendered on /resume and printed to /resume.pdf.
 *
 * Single source of truth: the HTML page and the PDF are generated from
 * this, so neither can drift. No volatile values (GPA, credits earned,
 * semesters remaining) — those change every term and are exactly what
 * made the previously hand-maintained PDF advertise a stale GPA.
 */

export interface ResumeEntry {
	role: string;
	org: string;
	when: string;
	points: string[];
}

export interface ResumeProject {
	name: string;
	tech: string;
	live?: string;
	points: string[];
}

export const resumeContact = {
	name: 'Jake M. Viefhaus',
	location: 'Florissant, MO',
	phone: '(314) 900-9520',
	email: 'geekhaus314@proton.me',
	github: 'github.com/geekhaus314',
	githubUrl: 'https://github.com/geekhaus314',
	portfolio: 'pwn4g3.pages.dev',
	portfolioUrl: 'https://pwn4g3.pages.dev',
	pdfUrl: '/resume.pdf'
};

export const resumeSummary =
	'IT support and networking-focused Computer Science student, available on-site in the St. Louis area. Comfortable across Windows, Linux, and macOS, with hands-on networking fundamentals, DNS and domain administration, and production infrastructure I run end-to-end. Pursuing a B.S. in Computer Science (Cybersecurity Engineering Concentration) and looking for an employer willing to invest in a long-term hire.';

export const resumeSkills: Array<{ label: string; items: string }> = [
	{
		label: 'Systems',
		items:
			'Windows 10/11, Ubuntu/Debian, macOS, Windows Subsystem for Linux, Kali Linux, hardware troubleshooting, peripheral and driver issues, disk imaging, Android/ADB'
	},
	{
		label: 'Networking',
		items:
			'TCP/IP, DNS, routing and switching concepts, LAN/WAN, Wi-Fi configuration and troubleshooting, port and protocol analysis, DHCP'
	},
	{
		label: 'Cloud & Hosting',
		items: 'Cloudflare Pages/Workers/DNS/Wrangler, domain and registrar management, R2 object storage, D1 databases'
	},
	{
		label: 'Security',
		items:
			'OWASP Top 10, Nmap, Burp Suite, nuclei, vulnerability research, access and credential hygiene, CSP reporting'
	},
	{ label: 'Scripting', items: 'Python, Bash, PowerShell, JavaScript/TypeScript, Java, SQL' },
	{
		label: 'Tooling',
		items: 'Git/GitHub, GitHub Actions (CI/CD), Docker, Linux CLI, uptime and health monitoring, issue tracking'
	}
];

export const resumeEducation: Array<{ school: string; degree: string; when: string; detail: string }> = [
	{
		school: 'Webster University',
		degree: 'B.S. Computer Science, Cybersecurity Engineering Concentration',
		when: 'Incoming, Spring 2027',
		detail: 'Transferring from CTU; expected graduation 2029.'
	},
	{
		school: 'Colorado Technical University',
		degree: 'B.S. Computer Science / Cybersecurity Engineering',
		when: 'Enrolled December 2025',
		detail:
			"Dean's List. Coursework: Fundamentals of Networking, Fundamentals of Programming, Introduction to Programming (Python), Introduction to Computer Security, Information Security Fundamentals."
	}
];

export const resumeExperience: ResumeEntry[] = [
	{
		role: 'Freelance IT, Web & Infrastructure Support',
		org: 'Independent',
		when: '2026 – Present',
		points: [
			'Own production infrastructure end-to-end for client sites — domain and DNS administration, hosting configuration, deployment, and uptime monitoring.',
			'Build and operate a 16-service Cloudflare Workers backend with a relational D1 database, deployed through automated GitHub Actions pipelines.',
			'Diagnose and resolve production issues including DNS misconfiguration, cache and header behavior, and performance regressions.',
			'Handle client communication directly: scoping requests, reporting status, documenting work, and managing security reviews.'
		]
	},
	{
		role: 'Security Research',
		org: 'Independent',
		when: '2026',
		points: [
			'Conducted authorized vulnerability research against Dropbox, Azure DevOps, and other in-scope targets; operated a Kali Linux reconnaissance and testing lab.'
		]
	},
	{
		role: 'E-Commerce Infrastructure Developer',
		org: 'United Distribution, Florissant, MO',
		when: '2026',
		points: [
			'Built multi-tenant B2B/B2C e-commerce infrastructure for a wholesale distributor covering 100+ SKU categories, payment processing, and deployment pipeline, working directly with the owner.'
		]
	}
];

export const resumeProjects: ResumeProject[] = [
	{
		name: 'pwn4g3 Platform',
		tech: 'Cloudflare Workers · D1 · CI/CD',
		live: 'pwn4g3.pages.dev',
		points: [
			'Operate 16 deployed Cloudflare Workers (payments, booking, admin, audit, scheduler, health monitoring, guestbook, Reddit and Discord integrations) sharing rate-limiting, CORS, and audit-logging middleware.',
			'Administer an 11-migration D1 schema covering telemetry with daily rollups, uptime monitoring, notifications, lead tracking, and audit runs.',
			'Restrict administrative access with source-IP allowlisting and token authentication; track security events through a CSP report pipeline.',
			'Run a documented change process for production work: tracked tasks with named file ownership, a required type-check gate before any change closes, and CI deployment on merge.'
		]
	},
	{
		name: 'Local Outreach Automation',
		tech: 'Python',
		points: [
			'Built a pipeline that scrapes, scores, and qualifies local business records into a structured ledger, with CSV/XLSX export.',
			'Designed the ingest endpoint with input validation, schema versioning, rate limiting, and duplicate rejection, requiring explicit user confirmation before any transmission.'
		]
	},
	{
		name: 'Reddit Devvit Application',
		tech: 'React · Hono · TypeScript',
		points: [
			'Built an application on Reddit’s Devvit developer platform using React for the interface and Hono for backend services.'
		]
	}
];
