export interface Post {
	slug: string;
	title: string;
	date: string;
	updated?: string;
	excerpt: string;
	tags: string[];
	body: string;
}

const p = (post: Post): Post => post;

export const posts: Post[] = [
	p({
		slug: 'rescued-dead-client-site-one-day',
		title: 'I rescued a dead client site in one day',
		date: '2026-09-10',
		excerpt:
			"A St. Louis clinic's website went completely dark. By evening it was live again — faster, on a custom domain, taking bookings. Here's exactly what I did.",
		tags: ['case study', 'client work', 'St. Louis'],
		body: `
<p>A local clinic called with every business owner's nightmare: their website was down. Not slow — gone. No bookings, no contact form, no presence while competitors took every click.</p>
<h2>What was wrong</h2>
<p>The previous setup had rotted: a broken deployment pipeline, DNS pointing at nothing, and no working backup anyone could find. The site wasn't hacked or cursed — it was simply unmaintained, which is how most small-business sites die.</p>
<h2>What I did, in one day</h2>
<ul>
<li>Rebuilt the site as a fast static deployment with a working pipeline, so updates go live in minutes instead of mysteries.</li>
<li>Rewired DNS and put it on its own custom domain with proper records.</li>
<li>Restored booking and contact flows and verified each one end to end.</li>
<li>Added the unglamorous foundations: SEO metadata, analytics, security headers, favicon and branding.</li>
</ul>
<h2>The result</h2>
<p>Same-day recovery from dead to live at <a href="https://www.myhairloss.com">myhairloss.com</a> — and I stayed on as webmaster, so it can't rot again. Maintenance is the product as much as the build is.</p>
<p><strong>The lesson for owners:</strong> if your site depends on one person who set it up years ago and vanished, you are one expired credential from invisible. A rebuild with a pipeline and a maintainer costs less than a month of lost bookings.</p>
<p><a href="https://webrehabstl.pages.dev/book">In the same situation? Tell me about it — I reply in 24 hours.</a></p>`
	}),
	p({
		slug: 'what-1200-website-includes',
		title: 'What a $1,200 website actually includes',
		date: '2026-09-12',
		excerpt:
			'No mystery invoices. Here is the itemized anatomy of a launch site — every page, integration, and guarantee, priced in public.',
		tags: ['pricing', 'transparency', 'services'],
		body: `
<p>Most web developers hide pricing behind a "book a call" wall. I publish mine on the <a href="https://webrehabstl.pages.dev/services">services page</a> and in the <a href="https://webrehabstl.pages.dev/shop">shop</a>. This post is the receipt-level detail for the $1,200 Launch package.</p>
<h2>What you get</h2>
<ul>
<li><strong>Up to 5 custom pages</strong> — designed around your content, mobile-first, written to convert visitors into contacts.</li>
<li><strong>Booking or contact flow wired to email</strong> — spam-filtered, tested, with notifications that actually arrive.</li>
<li><strong>SEO foundations</strong> — metadata, social share cards, sitemap, analytics.</li>
<li><strong>Security headers + branding</strong> — favicon, hardening basics, custom domain deployment.</li>
<li><strong>One revision round + 30 days of fixes</strong> — in writing, before you pay the balance.</li>
</ul>
<h2>What you don't get</h2>
<p>Surprises. The price is fixed in a written scope: what we agree on is what you pay. You own the code outright on final payment — no lock-in, no monthly hostage fees to me.</p>
<h2>Why I publish this</h2>
<p>Price transparency filters for the right clients: people who want to know what they're buying. If that's you, <a href="https://webrehabstl.pages.dev/shop">the Launch package is one click away</a>, or start with a <a href="https://webrehabstl.pages.dev/shop">$350 audit</a> if you're not sure what's wrong yet.</p>`
	}),
	p({
		slug: 'portfolio-runs-own-edge-network',
		title: 'This portfolio runs on its own edge network',
		date: '2026-09-15',
		excerpt:
			'The page you are reading is the demo: SvelteKit frontend, a gateway-routed worker fleet, queues, D1, R2. Your project would ship on the same steel.',
		tags: ['infrastructure', 'cloudflare', 'case study'],
		body: `
<p>Agencies show you mockups. I show you production. This site is a full-stack system, and every layer of it is something I sell:</p>
<h2>The stack</h2>
<ul>
<li><strong>Frontend:</strong> SvelteKit on Cloudflare Pages — server-rendered at the edge, prerendered where static wins.</li>
<li><strong>Backend:</strong> a typed worker fleet behind one gateway — booking pipeline with spam filtering and queues, telemetry, notifications, media CDN, a Solidity security analyzer, a Stripe payments service, and an escape-room API with hidden cipher layers.</li>
<li><strong>Data:</strong> D1 databases (app + isolated payments ledger), R2 object storage, queues with dead-letter handling.</li>
</ul>
<h2>Why it matters to a buyer</h2>
<p>A developer who operates their own infrastructure doesn't hand you a site and disappear — they hand you a system with logging, retries, status checks, and a human who knows where every wire goes. Open the <a href="/lab">Live Lab</a> and kick the tires: the analyzer and the service map are the same code your project would run on.</p>
<p><a href="https://webrehabstl.pages.dev/book">Want infrastructure like this under your business? Start here.</a></p>`
	}),
	p({
		slug: 'business-site-loses-phone-customers',
		title: 'Your business site is losing customers on phones',
		date: '2026-09-18',
		excerpt:
			'Most local customers find you on a phone. Most local business sites were built for a desktop. The math on that gap — and the three fixes that close it.',
		tags: ['mobile', 'SEO', 'local business', 'St. Louis'],
		body: `
<p>Over 60% of local searches happen on phones. Now open your business site on yours. If you have to pinch, zoom, or hunt for the phone number, you're watching customers leave in real time — most won't tell you, they'll just tap the next result.</p>
<h2>The three fixes that matter most</h2>
<ul>
<li><strong>Mobile-first layout</strong> — tap-sized buttons, readable type, click-to-call and click-to-email on every screen. No pinching, ever.</li>
<li><strong>Speed</strong> — every second of load time costs conversions. Modern static builds load in under two seconds on a phone connection.</li>
<li><strong>HTTPS + basics</strong> — browsers flag insecure sites, and Google buries them. A surprising number of local sites still fail this free check.</li>
</ul>
<h2>How to know where you stand</h2>
<p>I score local business sites on exactly these signals and more — HTTPS, mobile markup, speed, SEO basics, stale content — and turn it into a prioritized fix list. The <a href="https://webrehabstl.pages.dev/shop">$350 audit</a> gets you a video walkthrough plus the written report in 48 hours, credited toward any build within 30 days.</p>
<p>St. Louis business? <a href="https://webrehabstl.pages.dev/book">Send me your URL</a> and I'll tell you the single worst thing on it, free.</p>`
	})
];

export const getPost = (slug: string): Post | undefined => posts.find((post) => post.slug === slug);
