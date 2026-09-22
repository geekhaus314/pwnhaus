<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { GATEWAY_BASE } from '$lib/config';

	interface Product {
		code: string;
		name: string;
		price: string;
		tagline: string;
		includes: string[];
		delivery: string;
		contactOnly?: boolean;
	}

	const products: Product[] = [
		{
			code: 'audit',
			name: 'Website Audit',
			price: '$350',
			tagline: 'Know exactly what is wrong before you spend a dollar fixing it.',
			includes: ['2-minute video walkthrough', 'Written findings + priority fixes', 'Delivered in 48 hours'],
			delivery: '48h turnaround'
		},
		{
			code: 'redesign',
			name: 'Site Redesign',
			price: '$900',
			tagline: 'Your content, rebuilt mobile-first on a modern stack.',
			includes: ['Mobile-first rebuild', 'SEO + speed foundations', '30 days of fixes'],
			delivery: '1–2 weeks'
		},
		{
			code: 'launch',
			name: 'Launch Website',
			price: '$1,200',
			tagline: 'A complete web presence for a local business.',
			includes: ['Up to 5 custom pages', 'Booking / contact + email', 'SEO, analytics, branding'],
			delivery: '1–2 weeks'
		},
		{
			code: 'booking',
			name: 'Booking System',
			price: '$1,800',
			tagline: 'Customers book while you sleep. You get an email.',
			includes: ['Online booking flow', 'Email notifications', 'Spam-proofed forms'],
			delivery: '2–3 weeks'
		},
		{
			code: 'storefront',
			name: 'Online Store',
			price: '$2,400',
			tagline: 'Product catalog plus Stripe checkout on your domain.',
			includes: ['Catalog + categories', 'Stripe checkout', 'Custom domain + deploy'],
			delivery: '3–4 weeks'
		},
		{
			code: 'build',
			name: 'Custom Web App',
			price: '$2,800',
			tagline: 'Dashboards, portals, SaaS MVPs — typed end to end.',
			includes: ['Auth + admin panel', 'Database + CI/CD', '60 days of support'],
			delivery: '3–5 weeks'
		},
		{
			code: 'scale',
			name: 'Engineering Partner',
			price: '$5,000+',
			tagline: 'Platforms, AI systems, ongoing engineering. Scoped together.',
			includes: ['Multi-tenant / AI builds', 'Security review included', 'Retainer available'],
			delivery: 'Ongoing',
			contactOnly: true
		}
	];

	type Phase = 'idle' | 'email' | 'loading' | 'paying' | 'done' | 'error';

	let activeCode = $state<string | null>(null);
	let phase = $state<Phase>('idle');
	let email = $state('');
	let message = $state('');
	let paidOrder = $state<{ id: string; amount: number; status: string } | null>(null);
	let publishableKey = $state<string | null>(null);
	let stripePromise: Promise<unknown> | null = null;

	const API = `${GATEWAY_BASE}/api/payments`;

	function loadStripeJs(): Promise<unknown> {
		if ((window as unknown as { Stripe?: unknown }).Stripe) {
			return Promise.resolve((window as unknown as { Stripe: unknown }).Stripe);
		}
		if (!stripePromise) {
			stripePromise = new Promise((resolve, reject) => {
				const s = document.createElement('script');
				s.src = 'https://js.stripe.com/v3/';
				s.async = true;
				s.onload = () => resolve((window as unknown as { Stripe: unknown }).Stripe);
				s.onerror = () => reject(new Error('stripe_js_failed'));
				document.head.appendChild(s);
			});
		}
		return stripePromise;
	}

	async function startBuy(code: string) {
		activeCode = code;
		phase = 'email';
		message = '';
		email = '';
	}

	async function submitEmail() {
		if (!activeCode) return;
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			message = 'Enter a valid email — your receipt and delivery go there.';
			return;
		}
		phase = 'loading';
		message = '';
		try {
			if (!publishableKey) {
				const info = await fetch(API, { cache: 'no-store' }).then((r) => r.json());
				publishableKey = info?.data?.publishableKey ?? null;
			}
			const res = await fetch(`${API}/checkout`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ package: activeCode, email, embedded: Boolean(publishableKey) })
			});
			const body = await res.json();
			if (!res.ok || !body.ok) throw new Error(body.error ?? 'checkout_failed');
			if (body.data.url) {
				// Embedded unavailable — fall back to hosted checkout.
				window.location.href = body.data.url as string;
				return;
			}
			const StripeCtor = (await loadStripeJs()) as unknown as (key: string) => {
				initEmbeddedCheckout: (opts: { clientSecret: string }) => Promise<{ mount: (sel: string) => void }>;
			};
			const stripe = StripeCtor(publishableKey as string);
			const checkout = await stripe.initEmbeddedCheckout({ clientSecret: body.data.clientSecret as string });
			phase = 'paying';
			checkout.mount('#embedded-checkout');
		} catch (e) {
			phase = 'error';
			message = 'Checkout could not start. Email me directly and I will send a payment link.';
		}
	}

	async function checkPaid(orderId: string) {
		try {
			const res = await fetch(`${API}?id=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
			const body = await res.json();
			if (res.ok && body.ok) paidOrder = body.data;
		} catch {
			/* ignore */
		}
	}

	onMount(() => {
		const orderId = $page.url.searchParams.get('order');
		if ($page.url.searchParams.get('paid') === '1' && orderId) {
			phase = 'done';
			checkPaid(orderId);
		}
	});
</script>

<svelte:head>
	<title>Shop — Buy the Build — pwn4g3</title>
	<meta name="description" content="Buy a website audit, redesign, launch site, booking system, online store, or custom web app from Jake Viefhaus (pwn4g3). Fixed prices, secure Stripe checkout, 24h response." />
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Shop</p>
	<h1>Buy the build, <em>not the meeting</em></h1>
	<p class="lede">
		Fixed prices, secure checkout, receipt by email. Prefer 50% to start instead of full
		price? <a href="/book">Ask over email</a> — same queue either way.
	</p>
</section>

{#if phase === 'done'}
	<section class="section paid-panel">
		<div class="hire-panel reveal revealed">
			<div>
				<h3>Payment <em>received.</em></h3>
				{#if paidOrder}
					<p>Order <b>{paidOrder.id}</b> — ${(paidOrder.amount / 100).toLocaleString()} · {paidOrder.status}. Your receipt is on its way to your inbox and I reply within 24 hours to kick off.</p>
				{:else}
					<p>Thanks — your receipt is on its way to your inbox and I reply within 24 hours to kick off.</p>
				{/if}
			</div>
			<div class="hire-cta">
				<a href="/work" class="button ghost">Browse the standard →</a>
			</div>
		</div>
	</section>
{/if}

<section class="section shop-grid-section">
	<div class="package-grid">
		{#each products as product}
			<div class="pkg reveal" class:featured={product.code === 'launch'}>
				<span class="pkg-code">{product.code.toUpperCase()}</span>
				<h2>{product.name}</h2>
				<div class="pkg-price">
					<strong>{product.price}</strong>
					<span>{product.delivery}</span>
				</div>
				<p class="pkg-best">{product.tagline}</p>
				<ul>
					{#each product.includes as f}
						<li>→ {f}</li>
					{/each}
				</ul>
				{#if product.contactOnly}
					<a class="button ghost" href="/book">Scope it →</a>
				{:else if activeCode === product.code && (phase === 'email' || phase === 'loading' || phase === 'error')}
					<div class="buy-box">
						<label for="buy-email-{product.code}">Email for receipt + delivery</label>
						<input
							id="buy-email-{product.code}"
							type="email"
							bind:value={email}
							placeholder="you@business.com"
							autocomplete="email"
						/>
						<button class="button primary" onclick={submitEmail} disabled={phase === 'loading'}>
							{phase === 'loading' ? 'Starting…' : `Pay ${product.price} →`}
						</button>
						{#if message}<p class="buy-msg">{message}</p>{/if}
					</div>
				{:else}
					<button class="button primary" onclick={() => startBuy(product.code)}>Buy now →</button>
				{/if}
			</div>
		{/each}
	</div>
</section>

{#if phase === 'paying'}
	<section class="section">
		<div class="lab-panel reveal revealed">
			<div class="lab-head"><span class="lab-dot"></span> Secure checkout — card details never touch this site</div>
			<div class="checkout-shell"><div id="embedded-checkout"></div></div>
		</div>
	</section>
{/if}

<section class="cta">
	<p class="eyebrow"><i aria-hidden="true"></i> Not sure which?</p>
	<h2>Start with the <em>audit.</em></h2>
	<p>$350 tells you exactly what's wrong — credited toward any build if you proceed within 30 days.</p>
	<a class="button primary" href="/book">Or just ask →</a>
</section>

<style>
	.shop-grid-section { padding-top: 0; }
	.package-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}
	.pkg {
		background: var(--surface, #080a0d);
		border: 1px solid rgba(236, 231, 224, 0.08);
		border-radius: 12px;
		padding: 2rem 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		position: relative;
		transition: border-color 0.2s, transform 0.2s;
	}
	.pkg:hover { border-color: rgba(165, 29, 55, 0.5); transform: translateY(-2px); }
	.pkg.featured {
		border-color: var(--accent, #a51d37);
		background: linear-gradient(160deg, rgba(165, 29, 55, 0.08), var(--surface, #080a0d) 45%);
	}
	.pkg-code {
		font: 0.7rem var(--font-mono, monospace);
		color: var(--accent-bright, #e33d5c);
		letter-spacing: 0.15em;
	}
	.pkg h2 {
		font-family: var(--font-heading, 'Cormorant Garamond'), serif;
		font-size: 2rem;
		font-weight: 500;
		margin: 0;
	}
	.pkg-price { display: flex; align-items: baseline; gap: 0.75rem; }
	.pkg-price strong { font-size: 1.6rem; font-weight: 600; }
	.pkg-price span { font: 0.7rem var(--font-mono, monospace); color: var(--muted, #898681); }
	.pkg-best { color: var(--muted, #898681); font-size: 0.85rem; line-height: 1.6; }
	.pkg ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.55rem; }
	.pkg li { color: var(--ink, #ece7e0); font-size: 0.85rem; line-height: 1.5; }
	.pkg .button { margin-top: auto; text-align: center; }
	.buy-box { display: grid; gap: 0.7rem; margin-top: auto; }
	.buy-box label { font: 600 0.62rem var(--font-mono, monospace); text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
	.buy-box input {
		background: var(--page);
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		color: var(--ink);
		font: 0.85rem var(--font-sans);
		padding: 0.8rem 1rem;
		width: 100%;
	}
	.buy-box input:focus { border-color: var(--accent); outline: none; }
	.buy-msg { color: var(--warn); font-size: 0.8rem; margin: 0; }
	.checkout-shell { padding: 1.5rem; }
	.cta { text-align: center; padding: 4rem 5vw 6rem; }
	.cta h2 {
		font-family: var(--font-heading);
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 500;
		margin: 0.75rem 0 1rem;
	}
	.cta em { color: var(--accent); font-style: italic; }
	.cta p { color: var(--muted); }
	.cta .button { display: inline-block; margin-top: 1rem; }
	.paid-panel { padding-bottom: 0; }
</style>
