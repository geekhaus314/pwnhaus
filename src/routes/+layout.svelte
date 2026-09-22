<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import BootSequence from '$lib/components/BootSequence.svelte';
	import { profile } from '$lib/data/profile';

	let { children, data }: { children: import('svelte').Snippet; data: { canonical: string } } = $props();

	let menuOpen = $state(false);

	const links = [
		{ href: '/', label: 'Home' },
		{ href: '/work', label: 'Work' },
		{ href: '/services', label: 'Services' },
		{ href: '/shop', label: 'Shop' },
		{ href: '/lab', label: 'Live Lab' },
		{ href: '/about', label: 'About' },
		{ href: '/book', label: 'Book' }
	];

	const isCurrent = (href: string): boolean =>
		href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);

	// Mouse-tracking pointer for CSS radial gradient effects
	function trackPointer(e: MouseEvent) {
		document.documentElement.style.setProperty('--pointer-x', `${e.clientX}px`);
		document.documentElement.style.setProperty('--pointer-y', `${e.clientY}px`);
	}

	// Intersection observer for scroll-reveal animations.
	// Re-runs after every client-side navigation so newly rendered
	// `.reveal` elements animate (multi-page: layout onMount fires once).
	function setupReveal() {
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) entry.target.classList.add('revealed');
				});
			},
			{ threshold: 0.12 }
		);
		document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => io.observe(el));
		return () => io.disconnect();
	}

	const year = new Date().getFullYear();

	// Deployed commit info from env
	const gitSha: string = import.meta.env.VITE_GIT_SHA ?? '';
	const buildTime: string = import.meta.env.VITE_BUILD_TIME ?? '';

	onMount(() => {
		// Hydration is running — from here the reveal observer can safely
		// manage visibility. Before this class is set, `.reveal` content stays
		// visible so a failed/blocked hydration never leaves the page blank.
		document.documentElement.classList.add('js');
		let cleanReveal = setupReveal();
		afterNavigate(() => {
			menuOpen = false;
			cleanReveal();
			cleanReveal = setupReveal();
		});
		window.addEventListener('mousemove', trackPointer, { passive: true });
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(() => {});
		}
		return () => {
			cleanReveal();
			window.removeEventListener('mousemove', trackPointer);
		};
	});
</script>

<svelte:head>
	<title>Jake Viefhaus (pwn4g3) — Full-Stack Developer for Hire</title>
	<link rel="canonical" href={data.canonical} />
</svelte:head>

<div class="site-shell">
	<BootSequence />
	<a href="#main" class="skip-link">Skip to content</a>

	<!-- ── Navigation ── -->
	<header class="nav">
		<a href="/" class="brand">pwn<span>4g3</span></a>

		<nav aria-label="Main navigation">
			{#each links as link}
				<a href={link.href} class:current={isCurrent(link.href)}>{link.label}</a>
			{/each}
		</nav>

		<div class="nav-right">
			<ThemeSwitcher />
			<a href="/book" class="nav-cta">Hire me</a>
			<button
				type="button"
				class="menu-toggle"
				aria-expanded={menuOpen}
				aria-controls="mobile-menu"
				aria-label={menuOpen ? 'Close menu' : 'Open menu'}
				onclick={() => (menuOpen = !menuOpen)}
			><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span></button>
		</div>
	</header>

	{#if menuOpen}
		<nav id="mobile-menu" class="mobile-menu" aria-label="Mobile navigation">
			{#each links as link}
				<a href={link.href} class:current={isCurrent(link.href)} onclick={() => (menuOpen = false)}>{link.label}</a>
			{/each}
			<a href="/book" class="button primary" onclick={() => (menuOpen = false)}>Hire me →</a>
		</nav>
	{/if}

	<!-- ── Page content ── -->
	<main id="main" tabindex="-1">
		{@render children()}
	</main>

	<!-- ── Footer ── -->
	<footer>
		<p>© {year} pwn4g3 · Jake M. Viefhaus</p>
		<p class="co-conspirator">{profile.coConspirator}</p>
		<nav class="footer-links" aria-label="Social links">
			<a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub</a>
			<a href={profile.github2} target="_blank" rel="noopener noreferrer">3m0h4ck3r</a>
			<a href={profile.gitlab} target="_blank" rel="noopener noreferrer">GitLab</a>
			<a href="mailto:{profile.email}">Email</a>
		</nav>
	</footer>

	{#if gitSha}
		<div class="build-info">
			Deployed from
			<a
				href="https://github.com/geekhaus314/pwnhaus/commit/{gitSha}"
				target="_blank"
				rel="noopener noreferrer"
			>{gitSha.slice(0, 7)}</a>
			via GitHub Actions{buildTime ? ` · ${new Date(buildTime).toUTCString()}` : ''}
		</div>
	{:else}
		<div class="build-info">Deployed via Cloudflare Pages</div>
	{/if}
</div>

<style>
	.skip-link {
		position: fixed;
		top: -100px;
		left: 1rem;
		z-index: 100;
		background: var(--accent, #a51d37);
		color: #fff;
		padding: 0.75rem 1.25rem;
		font: 600 0.7rem var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		transition: top 0.2s;
		border-radius: 0 0 4px 4px;
	}
	.skip-link:focus-visible { top: 0; }

	.nav-right {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

	.menu-toggle {
		display: none;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		background: transparent;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		padding: 0.6rem 0.55rem;
		cursor: pointer;
	}
	.menu-toggle span {
		display: block;
		width: 20px;
		height: 2px;
		background: var(--ink);
		transition: transform 0.2s, opacity 0.2s;
	}
	.menu-toggle[aria-expanded='true'] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
	.menu-toggle[aria-expanded='true'] span:nth-child(2) { opacity: 0; }
	.menu-toggle[aria-expanded='true'] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

	.mobile-menu {
		display: none;
		position: sticky;
		top: 64px;
		z-index: 29;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 5vw 1.25rem;
		background: color-mix(in srgb, var(--page) 94%, transparent);
		backdrop-filter: blur(18px);
		border-bottom: 1px solid var(--line);
	}
	.mobile-menu a:not(.button) {
		padding: 0.7rem 0.25rem;
		font: 600 0.85rem var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted);
		border-bottom: 1px solid var(--line);
	}
	.mobile-menu a.current:not(.button) { color: var(--accent-bright); }
	.mobile-menu .button { margin-top: 0.75rem; }

	.co-conspirator {
		font-size: 0.58rem;
		text-align: center;
	}

	.footer-links {
		display: flex;
		gap: 1.25rem;
	}
	.footer-links a:hover { color: var(--ink, #ece7e0); }

	.build-info {
		text-align: center;
		padding: 0.75rem 5vw 1.25rem;
		font: 0.55rem var(--font-mono, monospace);
		color: rgba(236, 231, 224, 0.55);
		text-transform: none;
	}
	.build-info a {
		text-decoration: underline;
		text-decoration-color: rgba(236, 231, 224, 0.45);
	}
	.build-info a:hover { color: rgba(236, 231, 224, 0.85); }

	@media (max-width: 960px) {
		.menu-toggle { display: inline-flex; }
		.mobile-menu { display: flex; }
	}
</style>
