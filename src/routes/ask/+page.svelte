<script lang="ts">
	import { ASK_API_URL } from '$lib/config';

	// #33: Ask-pwn4g3 chat UI. Dedicated route with source-cited answers,
	// cached badges, and honest rate-limit states (5/day/IP server-side).
	// SSR-safe: prerender emits the idle shell, all fetches in handlers.

	interface Source {
		title: string;
		tag: string;
	}

	type Status = 'idle' | 'asking' | 'done' | 'error';

	let question = $state('');
	let status = $state<Status>('idle');
	let answer = $state<string | null>(null);
	let sources = $state<Source[]>([]);
	let cached = $state(false);
	let errorMsg = $state<string | null>(null);

	const remaining = $derived(Math.max(0, 500 - question.length));

	async function ask() {
		const q = question.trim();
		if (q.length < 3) {
			errorMsg = 'Ask a real question — at least 3 characters.';
			status = 'error';
			return;
		}
		if (q.length > 500) {
			errorMsg = 'Keep it under 500 characters.';
			status = 'error';
			return;
		}
		status = 'asking';
		errorMsg = null;
		answer = null;
		sources = [];
		try {
			const res = await fetch(ASK_API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: q })
			});
			const body = await res.json().catch(() => null);
			if (res.status === 429) {
				errorMsg = 'Daily budget spent (5 questions/day/IP) — email me directly and I reply within 24 hours.';
				status = 'error';
				return;
			}
			if (!res.ok || !body?.ok) {
				errorMsg =
					body?.error === 'ask_unavailable'
						? 'Concierge is warming up — email me directly and I reply within 24 hours.'
						: 'Could not get an answer — check your connection and retry.';
				status = 'error';
				return;
			}
			answer = body.data.answer;
			sources = Array.isArray(body.data.sources) ? body.data.sources : [];
			cached = body.data.cached === true;
			status = 'done';
		} catch {
			errorMsg = 'Could not reach the concierge — check your connection and retry.';
			status = 'error';
		}
	}

	function reset() {
		question = '';
		answer = null;
		sources = [];
		errorMsg = null;
		status = 'idle';
	}
</script>

<svelte:head>
	<title>Ask — site concierge — pwn4g3</title>
	<meta
		name="description"
		content="Ask about pwn4g3 services, prices, booking, and live work. Source-cited answers from the site corpus, 5 questions per day."
	/>
</svelte:head>

<section class="page-hero">
	<p class="eyebrow"><i aria-hidden="true"></i> Ask</p>
	<h1>Ask the <em>concierge</em></h1>
	<p class="lede">
		Services, prices, booking, live work — answered from this site's own corpus
		with sources cited. 5 questions/day/IP so the AI budget survives.
	</p>
</section>

<section class="section ask-wrap">
	<div class="lab-panel">
		<div class="lab-head"><span class="lab-dot"></span> ASK-PWN4G3</div>
		<label for="ask-q">Your question</label>
		<textarea
			id="ask-q"
			bind:value={question}
			maxlength={500}
			rows={3}
			spellcheck={true}
			placeholder="e.g. How much is a redesign and how fast?"
			aria-describedby="ask-hint"
		></textarea>
		<div class="lab-actions">
			<button class="button primary" onclick={ask} disabled={status === 'asking'}>
				{status === 'asking' ? 'Thinking…' : 'Ask'}
			</button>
			<button class="button ghost" onclick={reset} disabled={status === 'asking'}>Clear</button>
			<span class="hint" id="ask-hint">{remaining} chars left</span>
		</div>

		<div aria-live="polite">
			{#if status === 'done' && answer}
				<div class="answer">
					<p>{answer}</p>
					{#if sources.length > 0}
						<p class="sources">
							Sources: {#each sources as s, i}{i > 0 ? ' · ' : ''}<span>{s.title} ({s.tag})</span>{/each}
							{#if cached}<span class="cached"> · cached</span>{/if}
						</p>
					{/if}
				</div>
			{:else if status === 'error'}
				<div class="lab-error" role="alert">{errorMsg}</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.ask-wrap { padding-top: 0; }
	.ask-wrap label {
		display: block;
		font: 600 0.62rem var(--font-mono, monospace);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--muted, #898681);
		margin: 0.75rem 0 0.4rem;
	}
	.ask-wrap textarea {
		width: 100%;
		background: var(--page);
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		color: var(--ink);
		font: 0.9rem var(--font-sans);
		padding: 0.9rem 1rem;
		resize: vertical;
	}
	.ask-wrap textarea:focus { border-color: var(--accent); outline: none; }
	.lab-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.hint {
		margin-left: auto;
		font: 500 0.65rem var(--font-mono, monospace);
		color: var(--muted, #898681);
	}
	.answer {
		margin-top: 1rem;
		border-top: 1px solid var(--line);
		padding-top: 1rem;
	}
	.answer p { line-height: 1.65; margin: 0 0 0.6rem; }
	.sources { font-size: 0.75rem; color: var(--muted, #898681); }
	.sources span { color: var(--ink, #ece7e0); }
	.cached { color: var(--ok, #35d07f); }
</style>
