<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
	import { profile } from '$lib/data/profile';

	let { children } = $props();

	let activeSection = $state('top');

	// Mouse-tracking pointer for CSS radial gradient effects
	function trackPointer(e: MouseEvent) {
		document.documentElement.style.setProperty('--pointer-x', `${e.clientX}px`);
		document.documentElement.style.setProperty('--pointer-y', `${e.clientY}px`);
	}

	// Intersection observer for scroll-reveal animations
	function setupReveal() {
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) entry.target.classList.add('revealed');
				});
			},
			{ threshold: 0.12 }
		);
		document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
		return () => io.disconnect();
	}

	// Scroll spy for nav active link
	function setupScrollSpy() {
		const ids = ['top', 'about', 'portfolio', 'career', 'booking'];
		const io = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) activeSection = entry.target.id;
				});
			},
			{ rootMargin: '-40% 0px -55% 0px' }
		);
		ids.forEach((id) => {
			const el = document.getElementById(id);
			if (el) io.observe(el);
		});
		return () => io.disconnect();
	}

	const year = new Date().getFullYear();

	// Deployed commit info from env
	const gitSha: string = import.meta.env.VITE_GIT_SHA ?? '';
	const buildTime: string = import.meta.env.VITE_BUILD_TIME ?? '';

	onMount(() => {
		const cleanReveal = setupReveal();
		const cleanSpy = setupScrollSpy();
		window.addEventListener('mousemove', trackPointer, { passive: true });
		return () => {
			cleanReveal();
			cleanSpy();
			window.removeEventListener('mousemove', trackPointer);
		};
	});
</script>

<svelte:head>
	<title>pwn4g3 — Software + Security Engineering</title>
</svelte:head>

<div class="site-shell">
	<!-- ── Navigation ── -->
	<header class="nav">
		<a href="/#top" class="brand">pwn<span>4g3</span></a>

		<nav aria-label="Main navigation">
			<a href="/#about"     class:current={activeSection === 'about'}>About</a>
			<a href="/#portfolio" class:current={activeSection === 'portfolio'}>Portfolio</a>
			<a href="/#career"    class:current={activeSection === 'career'}>Career</a>
			<a href="/#booking"   class:current={activeSection === 'booking'}>Book</a>
		</nav>

		<div class="nav-right">
			<ThemeSwitcher />
			<a href="mailto:{profile.email}" class="nav-cta">Hire me</a>
		</div>
	</header>

	<!-- ── Page content ── -->
	<main>
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
	.nav-right {
		display: flex;
		align-items: center;
		gap: 1.25rem;
	}

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
		color: rgba(236, 231, 224, 0.2);
		text-transform: none;
	}
	.build-info a {
		text-decoration: underline;
		text-decoration-color: rgba(236, 231, 224, 0.2);
	}
	.build-info a:hover { color: rgba(236, 231, 224, 0.5); }
</style>
