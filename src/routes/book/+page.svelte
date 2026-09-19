<script lang="ts">
	import BookingForm from '$lib/components/BookingForm.svelte';
	import PaperDoodles from '$lib/components/PaperDoodles.svelte';
	import { profile } from '$lib/data/profile';
</script>

<svelte:head>
	<title>Book a Project — pwn4g3</title>
	<meta name="description" content="Start a project with Jake Viefhaus (pwn4g3): freelance builds, redesigns, APIs, automation. Fixed scope, clear timeline, reply within 24 hours." />
</svelte:head>

<section class="page-hero page-hero--center">
	<p class="eyebrow"><i aria-hidden="true"></i> Booking open</p>
	<h1>Start a <em>project</em></h1>
	<p class="lede">
		Freelance builds, redesigns, APIs, automation. Fixed scope, clear timeline,
		reply within 24 hours. Prefer email? <a href="mailto:{profile.email}">{profile.email}</a>
	</p>
	<PaperDoodles />
</section>

<section class="section book-section">
	<div class="book-grid">
		<div class="booking-narrow reveal">
			<BookingForm />
		</div>
		<aside class="book-side reveal" aria-label="Why book">
			<h2>What you <em>get</em></h2>
			<ul class="hire-points">
				<li>Reply within 24 hours, quote with fixed scope</li>
				<li>You own the code — transferred on final payment</li>
				<li>Direct line to the engineer, no middlemen</li>
				<li>Live preview link while I build — no black box</li>
			</ul>
			<ul class="service-chips" aria-label="Freelance services">
				{#each ['Full-stack builds', 'Frontend / redesigns', 'APIs', 'Automation', 'SEO / data', 'Security hardening'] as service}
					<li>{service}</li>
				{/each}
			</ul>
			<div class="book-alt">
				<a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" class="button ghost">
					Resume (PDF) <span aria-hidden="true">→</span>
				</a>
				<a href={profile.coverLetterUrl} target="_blank" rel="noopener noreferrer" class="button ghost">
					Cover letter (PDF) <span aria-hidden="true">→</span>
				</a>
				<a class="contact-link" href="mailto:{profile.email}">or email {profile.email} directly</a>
			</div>
		</aside>
	</div>
</section>

<style>
	.book-section { padding-top: 0; }
	.book-grid {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		gap: clamp(2rem, 4vw, 3.5rem);
		align-items: start;
	}
	.book-side h2 {
		margin: 0;
		font-family: var(--font-heading);
		font-weight: 500;
		font-size: clamp(1.8rem, 3vw, 2.4rem);
		letter-spacing: -0.02em;
	}
	.book-side h2 em { color: var(--accent-bright); font-style: italic; }
	.book-alt { display: grid; gap: 1rem; margin-top: 1.75rem; align-content: start; }
	@media (max-width: 960px) {
		.book-grid { grid-template-columns: 1fr; }
	}
</style>
