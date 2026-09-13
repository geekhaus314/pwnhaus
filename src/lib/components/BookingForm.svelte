<script lang="ts">
	import { onMount } from 'svelte';
	import { bookingServices } from '$lib/data/profile';
	import { BOOKING_API_URL } from '$lib/config';

	// #31: form posts to the pwn4g3-booking worker via the gateway
	// (queue + Turnstile + D1 ledger, see workers/booking). Site key is
	// read live from GET /api/booking — never hardcoded.
	// (TurnstileApi + window.turnstile types live in src/app.d.ts.)

	type Status = 'idle' | 'sending' | 'queued' | 'sent' | 'error';
	type WidgetState = 'loading' | 'ready' | 'failed';

	const POLL_MS = 3000;
	const MAX_POLLS = 20;

	let status = $state<Status>('idle');
	let widgetState = $state<WidgetState>('loading');
	let name = $state('');
	let email = $state('');
	let service = $state(bookingServices[0]);
	let timeline = $state('');
	let details = $state('');
	let errors = $state<Record<string, string>>({});
	let turnstileToken = $state<string | null>(null);
	let bookingId = $state<string | null>(null);
	let ledgerStatus = $state<string | null>(null);
	let ledgerFailed = $state(false);
	let pollsExhausted = $state(false);
	let submitError = $state<string | null>(null);

	let widgetId: string | null = null;
	let pollTimer: ReturnType<typeof setTimeout> | null = null;

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (!name.trim()) e.name = 'Name is required';
		else if (name.trim().length < 2) e.name = 'Name must be at least 2 characters';
		if (!email.trim()) e.email = 'Email is required';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
		if (!details.trim()) e.details = 'Project details are required';
		else if (details.trim().length < 10) e.details = 'Please provide more detail (at least 10 chars)';
		if (widgetState === 'loading') e.turnstile = 'Security check is still loading — one moment…';
		else if (widgetState === 'failed') e.turnstile = 'Security check unavailable — email me directly instead.';
		else if (!turnstileToken) e.turnstile = 'Please complete the security check.';
		errors = e;
		return Object.keys(e).length === 0;
	}

	function buildMailtoHref(): string {
		const subject = encodeURIComponent(`Booking request — ${service}${timeline ? ` (${timeline})` : ''}`);
		const body = encodeURIComponent(
			`Name: ${name}\nEmail: ${email}\nService: ${service}\nTimeline: ${timeline}\n\n${details}`
		);
		return `mailto:geekhaus314@proton.me?subject=${subject}&body=${body}`;
	}

	function loadTurnstileScript(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (window.turnstile) return resolve();
			const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
			if (existing) {
				existing.addEventListener('load', () => resolve());
				existing.addEventListener('error', () => reject(new Error('script failed')));
				return;
			}
			const s = document.createElement('script');
			s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			s.async = true;
			s.defer = true;
			s.dataset.turnstile = '1';
			s.onload = () => resolve();
			s.onerror = () => reject(new Error('script failed'));
			document.head.appendChild(s);
		});
	}

	function resetWidget() {
		try {
			if (widgetId) window.turnstile?.reset(widgetId);
		} catch {
			/* widget already gone — nothing to reset */
		}
		turnstileToken = null;
	}

	function stopPolling() {
		if (pollTimer) {
			clearTimeout(pollTimer);
			pollTimer = null;
		}
	}

	/** Tokens are single-use: every attempt ends with a reset. */
	function finishAttempt() {
		stopPolling();
		resetWidget();
	}

	function pollStatus(id: string, attempt: number) {
		if (attempt >= MAX_POLLS) {
			pollsExhausted = true;
			return;
		}
		pollTimer = setTimeout(async () => {
			try {
				const res = await fetch(`${BOOKING_API_URL}?id=${encodeURIComponent(id)}`);
				if (res.status === 404) {
					status = 'error';
					submitError = 'Booking reference not found — please try again or email me directly.';
					finishAttempt();
					return;
				}
				const body = await res.json().catch(() => null);
				if (res.ok && body?.ok) {
					ledgerStatus = body.data.status;
					if (ledgerStatus === 'sent') {
						status = 'sent';
						finishAttempt();
						return;
					}
					if (ledgerStatus === 'failed') {
						status = 'error';
						ledgerFailed = true;
						finishAttempt();
						return;
					}
				}
			} catch {
				/* transient network blip — keep polling */
			}
			pollStatus(id, attempt + 1);
		}, POLL_MS);
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		submitError = null;
		ledgerFailed = false;
		pollsExhausted = false;
		if (!validate()) return;
		status = 'sending';
		try {
			const res = await fetch(BOOKING_API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, service, timeline, details, turnstileToken })
			});
			const body = await res.json().catch(() => null);
			const code: string | null = body && typeof body.error === 'string' ? body.error : null;

			if ((res.status === 202 || res.ok) && body?.ok && typeof body.data?.id === 'string') {
				const id: string = body.data.id;
				bookingId = id;
				ledgerStatus = body.data.status ?? 'queued';
				status = 'queued';
				name = '';
				email = '';
				service = bookingServices[0];
				timeline = '';
				details = '';
				errors = {};
				pollStatus(id, 0);
				return;
			}

			// Rejected — reset the single-use token so the next try is fresh.
			resetWidget();
			if (res.status === 429) {
				const retry = res.headers.get('retry-after');
				submitError = retry
					? `Too many requests — please try again in ${retry} seconds.`
					: 'Too many requests — please try again in a few minutes.';
			} else if (code === 'turnstile_failed' || code === 'turnstile_token_required') {
				submitError = null;
				errors = { ...errors, turnstile: 'Security check failed — please solve it again.' };
			} else if (code === 'turnstile_not_configured' || code === 'turnstile_unavailable') {
				submitError = 'Booking pipeline is temporarily down — email me directly instead.';
			} else if (code === 'name_email_details_required' || code === 'input_too_long') {
				submitError = 'Please check the form fields and try again.';
			} else {
				submitError = 'Something went wrong sending via the form.';
			}
			status = 'error';
		} catch {
			resetWidget();
			status = 'error';
			submitError = 'Something went wrong sending via the form.';
		}
	}

	onMount(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(BOOKING_API_URL);
				const body = await res.json().catch(() => null);
				const siteKey: unknown = body?.data?.turnstile?.siteKey;
				const action: unknown = body?.data?.turnstile?.action;
				if (cancelled) return;
				if (!res.ok || !body?.ok || typeof siteKey !== 'string' || !siteKey) {
					widgetState = 'failed';
					return;
				}
				await loadTurnstileScript();
				if (cancelled) return;
				widgetId = window.turnstile!.render('#bk-turnstile', {
					sitekey: siteKey,
					action: typeof action === 'string' && action ? action : 'booking',
					theme: 'auto',
					callback: (token: string) => {
						turnstileToken = token;
						if (errors.turnstile) {
							const { turnstile: _dropped, ...rest } = errors;
							errors = rest;
						}
					},
					'expired-callback': () => {
						turnstileToken = null;
					},
					'error-callback': () => {
						widgetState = 'failed';
					}
				});
				widgetState = 'ready';
			} catch {
				if (!cancelled) widgetState = 'failed';
			}
		})();
		return () => {
			cancelled = true;
			stopPolling();
		};
	});
</script>

<form onsubmit={submit} class="booking-form" novalidate>
	<div class="row">
		<div class="field">
			<label for="bk-name">Name</label>
			<input id="bk-name" required bind:value={name} placeholder="Your name" class:error={!!errors.name} />
			{#if errors.name}<span class="field-error">{errors.name}</span>{/if}
		</div>
		<div class="field">
			<label for="bk-email">Email</label>
			<input id="bk-email" type="email" required bind:value={email} placeholder="you@example.com" class:error={!!errors.email} />
			{#if errors.email}<span class="field-error">{errors.email}</span>{/if}
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
		<textarea id="bk-details" required rows={5} bind:value={details} placeholder="Tell me what you're building…" class:error={!!errors.details}></textarea>
		{#if errors.details}<span class="field-error">{errors.details}</span>{/if}
	</div>

	<div class="field turnstile-field">
		<span class="turnstile-label" id="bk-turnstile-label">Security check</span>
		<div id="bk-turnstile" class="turnstile-widget" role="group" aria-labelledby="bk-turnstile-label"></div>
		{#if widgetState === 'loading'}
			<span class="turnstile-hint">Loading security check…</span>
		{:else if widgetState === 'failed'}
			<span class="field-error">Security check couldn't load — you can still reach me by email below.</span>
		{/if}
		{#if errors.turnstile}<span class="field-error">{errors.turnstile}</span>{/if}
	</div>

	<button type="submit" disabled={status === 'sending' || status === 'queued'} class="submit-btn">
		{status === 'sending' ? 'Sending…' : status === 'queued' ? 'Queued…' : 'Request a booking'}
	</button>

	{#if status === 'queued'}
		<div class="msg queued" role="status">
			<p><span class="status-pill">● {ledgerStatus?.toUpperCase() ?? 'QUEUED'}</span> Request received — sending your email now…</p>
			{#if pollsExhausted}
				<p class="poll-note">Taking longer than usual — no need to resubmit, you'll still get a reply within a day.</p>
			{/if}
		</div>
	{/if}

	{#if status === 'sent'}
		<p class="msg success" role="status"><span class="status-pill sent">● SENT</span> Booking request sent — I'll get back to you within a day.</p>
	{/if}

	{#if status === 'error'}
		<div class="msg error" role="alert">
			<p>
				{#if ledgerFailed}
					The email send failed on our side — sorry about that.
				{:else}
					{submitError ?? 'Something went wrong sending via the form.'}
				{/if}
			</p>
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

	label,
	.turnstile-label {
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
	input.error, textarea.error {
		border-color: #f07178;
	}

	.field-error {
		font: 0.65rem var(--font-mono, monospace);
		color: #f07178;
	}

	textarea { resize: vertical; }

	.turnstile-widget { min-height: 65px; }
	.turnstile-widget:empty + .turnstile-hint { display: inline; }
	.turnstile-hint {
		font: 0.65rem var(--font-mono, monospace);
		color: rgba(236, 231, 224, 0.45);
	}

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
	.msg.queued p { color: rgba(236, 231, 224, 0.8); margin: 0 0 0.5rem; }
	.msg.error p { color: #f07178; margin: 0 0 0.5rem; }
	.status-pill {
		display: inline-block;
		border: 1px solid var(--accent, #a51d37);
		background: var(--accent-soft, rgba(165, 29, 55, 0.2));
		color: var(--ink, #ece7e0);
		padding: 0.2rem 0.6rem;
		font: 700 0.62rem var(--font-mono, monospace);
		letter-spacing: 0.1em;
		margin-right: 0.4rem;
		animation: pill-pulse 1.6s ease-in-out infinite;
	}
	.status-pill.sent { animation: none; border-color: #4ee082; }
	@keyframes pill-pulse { 50% { opacity: 0.55; } }
	.poll-note { font-size: 0.75rem; color: rgba(236, 231, 224, 0.55); }
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
