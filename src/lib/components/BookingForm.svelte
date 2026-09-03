<script lang="ts">
	import { bookingServices } from '$lib/data/profile';

	type Status = 'idle' | 'sending' | 'sent' | 'error';

	let status = $state<Status>('idle');
	let name = $state('');
	let email = $state('');
	let service = $state(bookingServices[0]);
	let timeline = $state('');
	let details = $state('');

	function buildMailtoHref(): string {
		const subject = encodeURIComponent(`Booking request — ${service}${timeline ? ` (${timeline})` : ''}`);
		const body = encodeURIComponent(
			`Name: ${name}\nEmail: ${email}\nService: ${service}\nTimeline: ${timeline}\n\n${details}`
		);
		return `mailto:geekhaus314@proton.me?subject=${subject}&body=${body}`;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		status = 'sending';
		try {
			const res = await fetch('/api/booking', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, service, timeline, details })
			});
			if (!res.ok) throw new Error('Request failed');
			status = 'sent';
			name = '';
			email = '';
			service = bookingServices[0];
			timeline = '';
			details = '';
		} catch {
			status = 'error';
		}
	}
</script>

<form onsubmit={submit} class="booking-form" novalidate>
	<div class="row">
		<div class="field">
			<label for="bk-name">Name</label>
			<input id="bk-name" required bind:value={name} placeholder="Your name" />
		</div>
		<div class="field">
			<label for="bk-email">Email</label>
			<input id="bk-email" type="email" required bind:value={email} placeholder="you@example.com" />
		</div>
	</div>

	<div class="row">
		<div class="field">
			<label for="bk-service">Service needed</label>
			<select id="bk-service" bind:value={service}>
				{#each bookingServices as svc}
					<option value={svc}>{svc}</option>
				{/each}
			</select>
		</div>
		<div class="field">
			<label for="bk-timeline">Timeline</label>
			<input id="bk-timeline" bind:value={timeline} placeholder="ASAP, 2 weeks, flexible…" />
		</div>
	</div>

	<div class="field">
		<label for="bk-details">Project details</label>
		<textarea id="bk-details" required rows={5} bind:value={details} placeholder="Tell me what you're building…"></textarea>
	</div>

	<button type="submit" disabled={status === 'sending'} class="submit-btn">
		{status === 'sending' ? 'Sending…' : 'Request a booking'}
	</button>

	{#if status === 'sent'}
		<p class="msg success">Booking request sent — I'll get back to you within a day.</p>
	{/if}

	{#if status === 'error'}
		<div class="msg error">
			<p>Something went wrong sending via the form.</p>
			<a href={buildMailtoHref()} class="fallback-link">Email me directly instead →</a>
		</div>
	{/if}
</form>

<style>
	.booking-form {
		max-width: 680px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	@media (max-width: 600px) { .row { grid-template-columns: 1fr; } }

	.field { display: flex; flex-direction: column; gap: 0.4rem; }

	label {
		font: 0.7rem var(--font-mono, monospace);
		color: rgba(236, 231, 224, 0.6);
		letter-spacing: 0.05em;
	}

	input, select, textarea {
		background: var(--surface, #080a0d);
		border: 1px solid rgba(236, 231, 224, 0.2);
		color: var(--ink, #ece7e0);
		padding: 0.65rem 1rem;
		font: 0.875rem var(--font-sans, system-ui);
		width: 100%;
		transition: border-color 0.2s;
		appearance: none;
	}
	input::placeholder, textarea::placeholder { color: rgba(236, 231, 224, 0.3); }
	input:focus, select:focus, textarea:focus {
		outline: none;
		border-color: var(--accent, #a51d37);
	}

	textarea { resize: vertical; }

	.submit-btn {
		background: var(--accent, #a51d37);
		border: 1px solid var(--accent, #a51d37);
		color: #fff;
		padding: 0.85rem;
		font: 600 0.8rem var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
		transition: opacity 0.2s;
		width: 100%;
	}
	.submit-btn:hover:not(:disabled) { opacity: 0.9; }
	.submit-btn:disabled { opacity: 0.5; cursor: wait; }

	.msg { margin-top: 0.5rem; text-align: center; font-size: 0.875rem; }
	.msg.success { color: #4ee082; }
	.msg.error p { color: #f07178; margin: 0 0 0.5rem; }
	.fallback-link {
		display: inline-block;
		border: 1px solid rgba(236, 231, 224, 0.25);
		padding: 0.5rem 1rem;
		color: rgba(236, 231, 224, 0.7);
		font: 0.75rem var(--font-mono, monospace);
		text-transform: uppercase;
		transition: border-color 0.2s;
	}
	.fallback-link:hover { border-color: var(--accent, #a51d37); }
</style>
