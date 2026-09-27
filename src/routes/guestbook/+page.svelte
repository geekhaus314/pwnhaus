<script lang="ts">
	import { onMount } from 'svelte';
	import { GATEWAY_BASE } from '$lib/config';

	// #35: guestbook UI. Lists approved entries only; submits land as
	// pending (moderation queue, #34) with an honest "appears after
	// approval" notice. Honeypot `website` field traps bots. SSR-safe:
	// prerender emits the shell, list loads in onMount.

	interface Entry {
		id: string;
		name: string;
		message: string;
		created_at: number;
	}

	const API = `${GATEWAY_BASE}/api/guestbook`;

	let entries = $state<Entry[]>([]);
	let listState = $state<'loading' | 'ready' | 'error'>('loading');
	let name = $state('');
	let message = $state('');
	let website = $state('');
	let formMsg = $state<string | null>(null);
	let submitting = $state(false);

	async function load() {
		listState = 'loading';
		try {
			const res = await fetch(`${API}?limit=50`, { cache: 'no-store' });
			const body = await res.json().catch(() => null);
			if (res.ok && body?.ok) {
				entries = body.data.entries ?? [];
				listState = 'ready';
			} else {
				listState = 'error';
			}
		} catch {
			listState = 'error';
		}
	}

	async function submit() {
		if (name.trim().length < 2 || name.trim().length > 40) {
			formMsg = 'Name must be 2–40 characters.';
			return;
		}
		if (message.trim().length < 3 || message.trim().length > 500) {
			formMsg = 'Message must be 3–500 characters.';
			return;
		}
		submitting = true;
		formMsg = null;
		try {
			const res = await fetch(API, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: name.trim(), message: message.trim(), website })
			});
			const body = await res.json().catch(() => null);
			if (res.status === 429) {
				formMsg = 'Slow down — 3 entries per hour. Try again later.';
				return;
			}
			if (!res.ok || !body?.ok) {
				formMsg = 'Could not save your entry — retry in a minute.';
				return;
			}
			formMsg = 'Thanks — your entry appears after approval.';
			name = '';
			message = '';
			website = '';
		} catch {
			formMsg = 'No connection — retry in a minute.';
		} finally {
			submitting = false;
		}
	}

	function fmtDate(ms: number): string {
		try {
			return new Date(ms).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
		} catch {
			return '';
		}
	}

	onMount(load);
</script>

<svelte:head>
	<title>Guestbook — kind words — pwn4g3</title>
	<meta name="description" content="Sign the pwn4g3 guestbook. Entries are moderated and appear after approval." />
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Guestbook</p>
	<h1>Kind <em>words</em></h1>
	<p class="lede">Worked together? Sign below — entries appear after approval.</p>
</section>

<section class="section gb-grid">
	<div class="lab-panel">
		<div class="lab-head"><span class="lab-dot"></span> SIGN IT</div>
		<label for="gb-name">Name</label>
		<input id="gb-name" bind:value={name} maxlength={40} placeholder="Jane, Acme Co" autocomplete="name" />
		<label for="gb-msg">Message</label>
		<textarea id="gb-msg" bind:value={message} maxlength={500} rows={3} placeholder="What did we ship together?"></textarea>
		<!-- Honeypot: humans never see this, bots fill it. -->
		<input class="hp" bind:value={website} placeholder="website" aria-hidden="true" tabindex="-1" autocomplete="off" />
		<div class="lab-actions">
			<button class="button primary" onclick={submit} disabled={submitting}>
				{submitting ? 'Saving…' : 'Sign guestbook →'}
			</button>
		</div>
		{#if formMsg}<p class="buy-msg" aria-live="polite">{formMsg}</p>{/if}
	</div>

	<div class="lab-panel">
		<div class="lab-head"><span class="lab-dot"></span> ENTRIES ({entries.length})</div>
		{#if listState === 'loading'}
			<p class="lab-empty">Loading entries…</p>
		{:else if listState === 'error'}
			<p class="lab-empty">Could not load entries — retry in a minute.</p>
		{:else if entries.length === 0}
			<p class="lab-empty">No entries yet — be the first. Yours appears after approval.</p>
		{:else}
			<ul class="entries">
				{#each entries as e (e.id)}
					<li>
						<b>{e.name}</b>
						<span class="date">{fmtDate(e.created_at)}</span>
						<p>{e.message}</p>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>

<style>
	.gb-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
		padding-top: 0;
	}
	.gb-grid label {
		display: block;
		font: 600 0.62rem var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted, #898681);
		margin: 0.75rem 0 0.4rem;
	}
	.gb-grid input:not(.hp),
	.gb-grid textarea {
		width: 100%;
		background: var(--page);
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		color: var(--ink);
		font-size: 0.9rem;
		padding: 0.8rem 1rem;
	}
	.gb-grid input:focus,
	.gb-grid textarea:focus { border-color: var(--accent); outline: none; }
	.hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
	.lab-actions { margin-top: 0.75rem; }
	.buy-msg { color: var(--warn); font-size: 0.8rem; }
	.entries { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
	.entries li { padding: 0.8rem 0; border-bottom: 1px solid var(--line); }
	.entries li:last-child { border-bottom: 0; }
	.entries b { color: var(--ink, #ece7e0); }
	.date { font: 0.65rem var(--font-mono, monospace); color: var(--muted, #898681); margin-left: 0.6rem; }
	.entries p { margin: 0.35rem 0 0; line-height: 1.6; font-size: 0.9rem; }
</style>
