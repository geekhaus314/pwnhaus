<script lang="ts">
	import {
		resumeContact,
		resumeEducation,
		resumeExperience,
		resumeProjects,
		resumeSkills,
		resumeSummary
	} from '$lib/data/resume';

	let copied = $state(false);
	let printBtn: HTMLButtonElement;

	const copyEmail = async () => {
		try {
			await navigator.clipboard.writeText(resumeContact.email);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			/* clipboard blocked (insecure context) — the address is on screen anyway */
		}
	};
</script>

<svelte:head>
	<title>Resume — Jake Viefhaus (pwn4g3)</title>
	<meta
		name="description"
		content="Resume for Jake Viefhaus: IT support and networking-focused Computer Science student, St. Louis. Windows, Linux, macOS, TCP/IP, DNS, and production Cloudflare infrastructure."
	/>
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Resume</p>
	<h1>Everything on <em>one page</em></h1>
	<p class="lede">Printable, readable, and theme-aware — same content as the PDF, rendered live.</p>
	<div class="doc-actions no-print">
		<a class="btn primary" href={resumeContact.pdfUrl} download>Download PDF</a>
		<button class="btn" bind:this={printBtn} onclick={() => printBtn.closest('body')?.ownerDocument.defaultView?.print()}>
			Print this page
		</button>
		<button class="btn" onclick={copyEmail}>{copied ? 'Copied' : 'Copy email'}</button>
	</div>
</section>

<div class="resume">
	<header class="resume-head">
		<h2>{resumeContact.name}</h2>
		<p class="resume-role">IT Support &amp; Networking — Computer Science Student</p>
		<p class="resume-contact">
			{resumeContact.location} &nbsp;·&nbsp;
			<a href={`tel:${resumeContact.phone.replace(/\D/g, '')}`}>{resumeContact.phone}</a> &nbsp;·&nbsp;
			<a href={`mailto:${resumeContact.email}`}>{resumeContact.email}</a> &nbsp;·&nbsp;
			<a href={resumeContact.githubUrl}>{resumeContact.github}</a> &nbsp;·&nbsp;
			<a href={resumeContact.portfolioUrl}>{resumeContact.portfolio}</a>
		</p>
	</header>

	<section class="rsec">
		<h3>Summary</h3>
		<p>{resumeSummary}</p>
	</section>

	<section class="rsec">
		<h3>Core Competencies</h3>
		<dl class="rskills">
			{#each resumeSkills as s}
				<dt>{s.label}</dt>
				<dd>{s.items}</dd>
			{/each}
		</dl>
	</section>

	<section class="rsec">
		<h3>Education</h3>
		{#each resumeEducation as e}
			<div class="rentry">
				<div class="rhead">
					<strong>{e.degree}</strong>
					<span>{e.when}</span>
				</div>
				<p class="rorg">{e.school}</p>
				<p class="rdetail">{e.detail}</p>
			</div>
		{/each}
	</section>

	<section class="rsec">
		<h3>Experience</h3>
		{#each resumeExperience as job}
			<div class="rentry">
				<div class="rhead">
					<strong>{job.role}</strong>
					<span>{job.when}</span>
				</div>
				<p class="rorg">{job.org}</p>
				<ul>
					{#each job.points as p}
						<li>{p}</li>
					{/each}
				</ul>
			</div>
		{/each}
	</section>

	<section class="rsec">
		<h3>Projects</h3>
		{#each resumeProjects as proj}
			<div class="rentry">
				<div class="rhead">
					<strong>{proj.name}</strong>
					{#if proj.live}<span>{proj.live}</span>{/if}
				</div>
				<p class="rorg">{proj.tech}</p>
				<ul>
					{#each proj.points as p}
						<li>{p}</li>
					{/each}
				</ul>
			</div>
		{/each}
	</section>
</div>

<style>
	.doc-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.btn {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.55rem 0.95rem;
		border: var(--border-w) solid var(--line);
		border-radius: var(--radius-sm);
		background: var(--surface-raised);
		color: var(--ink);
		cursor: pointer;
		text-decoration: none;
		transition: border-color 0.15s ease, color 0.15s ease;
	}
	.btn:hover {
		border-color: var(--accent);
		color: var(--accent-bright);
	}
	.btn.primary {
		border-color: var(--accent);
		color: var(--accent-bright);
	}

	.resume {
		max-width: 74ch;
		margin: 0 auto;
	}
	.resume-head {
		text-align: center;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--accent);
		margin-bottom: 1.4rem;
	}
	.resume-head h2 {
		margin: 0;
		font-size: clamp(1.5rem, 4vw, 2rem);
		letter-spacing: var(--heading-spacing);
		text-transform: var(--heading-case);
		color: var(--ink);
	}
	.resume-role {
		margin: 0.3rem 0 0;
		font-family: var(--font-mono);
		font-size: 0.76rem;
		color: var(--accent);
		letter-spacing: 0.04em;
	}
	.resume-contact {
		margin: 0.55rem 0 0;
		font-size: 0.78rem;
		color: var(--muted);
	}
	.resume-contact a {
		color: var(--ink);
		text-decoration: none;
		border-bottom: 1px solid var(--line);
	}

	.rsec {
		margin-bottom: 1.5rem;
	}
	.rsec h3 {
		margin: 0 0 0.55rem;
		padding-bottom: 0.2rem;
		border-bottom: 1px solid var(--line);
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: var(--label-tracking);
		text-transform: var(--label-transform);
		color: var(--accent);
	}

	.rskills {
		display: grid;
		grid-template-columns: minmax(96px, 128px) 1fr;
		gap: 0.35rem 1rem;
		margin: 0;
		font-size: 0.86rem;
	}
	.rskills dt {
		font-weight: 700;
		color: var(--ink);
	}
	.rskills dd {
		margin: 0;
		color: var(--muted);
	}

	.rentry {
		margin-bottom: 0.9rem;
	}
	.rhead {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}
	.rhead strong {
		font-size: 0.95rem;
		color: var(--ink);
	}
	.rhead span {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		color: var(--muted);
		white-space: nowrap;
	}
	.rorg {
		margin: 0.1rem 0 0.3rem;
		font-size: 0.8rem;
		color: var(--accent);
	}
	.rdetail {
		margin: 0.2rem 0 0;
		font-size: 0.84rem;
		color: var(--muted);
	}
	.rentry ul {
		margin: 0.3rem 0 0;
		padding-left: 1.1rem;
		font-size: 0.86rem;
		color: var(--muted);
	}
	.rentry li {
		margin-bottom: 0.2rem;
	}
	.rentry li::marker {
		color: var(--accent);
	}

	@media (max-width: 520px) {
		.rskills {
			grid-template-columns: 1fr;
			gap: 0.1rem;
		}
		.rskills dd {
			margin-bottom: 0.45rem;
		}
	}

	/* Screen-only chrome disappears when the page itself is printed. The
	   print stylesheet already strips nav/footer; this drops the buttons. */
	@media print {
		.doc-actions {
			display: none;
		}
	}
</style>
