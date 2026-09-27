<script lang="ts">
	import { ASK_API_URL } from '$lib/config';

	// #33 floating widget. Same API + states as /ask, compact shell.
	// Mounted in +layout (client only, no SSR fetch).

	let open = $state(false);
	let q = $state('');
	let busy = $state(false);
	let answer = $state<string | null>(null);
	let err = $state<string | null>(null);

	async function send() {
		const text = q.trim();
		if (text.length < 3 || text.length > 500 || busy) return;
		busy = true;
		err = null;
		answer = null;
		try {
			const res = await fetch(ASK_API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: text })
			});
			const body = await res.json().catch(() => null);
			if (res.status === 429) {
				err = 'Daily budget spent — try /ask tomorrow or email me.';
			} else if (!res.ok || !body?.ok) {
				err = 'Concierge unavailable — email me instead.';
			} else {
				answer = body.data.answer;
			}
		} catch {
			err = 'No connection — email me instead.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="ask-widget">
	{#if open}
		<div class="ask-pop" role="dialog" aria-label="Ask the concierge">
			<div class="ask-pop-head">
				<strong>Ask pwn4g3</strong>
				<a href="/ask">full page →</a>
				<button class="button ghost" onclick={() => (open = false)} aria-label="Close concierge">✕</button>
			</div>
			<div class="ask-pop-body" aria-live="polite">
				{#if answer}<p>{answer}</p>
				{:else if err}<p class="ask-err" role="alert">{err}</p>
				{:else}<p class="ask-idle">Services, prices, booking — 5/day/IP.</p>{/if}
			</div>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					send();
				}}
			>
				<input
					bind:value={q}
					maxlength={500}
					placeholder="Ask…"
					aria-label="Ask the concierge"
					disabled={busy}
				/>
				<button class="button primary" type="submit" disabled={busy || q.trim().length < 3}>
					{busy ? '…' : '→'}
				</button>
			</form>
		</div>
	{/if}
	<button
		class="ask-fab"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-label={open ? 'Close concierge' : 'Open concierge'}
	>
		?
	</button>
</div>

<style>
	.ask-widget { position: fixed; right: 1.1rem; bottom: 1.1rem; z-index: 40; display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem; }
	.ask-fab {
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		border: 1px solid var(--accent, #a51d37);
		background: var(--surface, #080a0d);
		color: var(--ink, #ece7e0);
		font: 700 1.2rem var(--font-mono, monospace);
		cursor: pointer;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45);
	}
	.ask-pop {
		width: min(22rem, calc(100vw - 2.5rem));
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface, #080a0d);
		overflow: hidden;
		box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
	}
	.ask-pop-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.6rem 0.8rem;
		border-bottom: 1px solid var(--line);
		font: 600 0.7rem var(--font-mono, monospace);
	}
	.ask-pop-head a { margin-left: auto; color: var(--muted, #898681); }
	.ask-pop-body { padding: 0.8rem; font-size: 0.85rem; line-height: 1.6; max-height: 16rem; overflow: auto; }
	.ask-idle { color: var(--muted, #898681); margin: 0; }
	.ask-err { color: var(--warn); margin: 0; }
	.ask-pop form { display: flex; gap: 0.5rem; padding: 0.6rem 0.8rem 0.8rem; }
	.ask-pop input {
		flex: 1;
		background: var(--page);
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		color: var(--ink);
		font-size: 0.85rem;
		padding: 0.6rem 0.75rem;
	}
</style>
