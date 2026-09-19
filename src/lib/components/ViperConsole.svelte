<script lang="ts">
	import { onMount } from 'svelte';
	import { VIPER_API_URL, VIPER_INFO_URL } from '$lib/config';

	// #46: live Viper-Web3 analyzer. PASTE → POST → findings cards.
	// All network I/O happens in event handlers / onMount (SSR-safe);
	// prerender emits the idle shell with a sample contract prefilled.

	interface Finding {
		id: string;
		severity: 'high' | 'medium' | 'low' | 'info' | string;
		title: string;
		recommendation: string;
	}

	interface PlanStep {
		stage: string;
		command: { id: string; bin: string; args: Array<string | number> };
	}

	interface Plan {
		toolchain: string;
		targets: string[];
		steps: PlanStep[];
	}

	interface AnalyzeOk {
		service: string;
		mode: string;
		findings: Finding[];
		summary: { findingCount: number; analyzedCharacters: number };
		pipeline?: Plan;
	}

	type Status = 'idle' | 'probing' | 'ready' | 'analyzing' | 'done' | 'error';

	const SAMPLE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Vault {
    address public owner = msg.sender;

    function withdraw() external {
        require(tx.origin == owner, "not owner");
        (bool ok, ) = msg.sender.call{value: address(this).balance}("");
        require(ok, "send failed");
    }

    function kill() external {
        require(tx.origin == owner, "not owner");
        selfdestruct(payable(owner));
    }
}`;

	let source = $state(SAMPLE);
	let wantPlan = $state(true);
	let status = $state<Status>('idle');
	let live = $state(false);
	let findings = $state<Finding[]>([]);
	let summary = $state<{ findingCount: number; analyzedCharacters: number } | null>(null);
	let pipeline = $state<Plan | null>(null);
	let errorMsg = $state<string | null>(null);

	const sevClass = (sev: string): string =>
		sev === 'high' ? 'sev-high' : sev === 'low' || sev === 'info' ? 'sev-low' : 'sev-medium';

	onMount(() => {
		let cancelled = false;
		status = 'probing';
		fetch(VIPER_INFO_URL, { cache: 'no-store' })
			.then((res) => {
				if (cancelled) return;
				live = res.ok;
				if (status === 'probing') status = 'idle';
			})
			.catch(() => {
				if (cancelled) return;
				live = false;
				if (status === 'probing') status = 'idle';
			});
		return () => {
			cancelled = true;
		};
	});

	async function analyze() {
		if (!source.trim()) {
			errorMsg = 'Paste a Solidity contract first — or run the sample.';
			status = 'error';
			return;
		}
		if (source.length > 200_000) {
			errorMsg = 'Contract exceeds the 200,000-character analyzer limit.';
			status = 'error';
			return;
		}
		status = 'analyzing';
		errorMsg = null;
		findings = [];
		pipeline = null;
		try {
			const res = await fetch(VIPER_API_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ source, ...(wantPlan ? { plan: true } : {}) })
			});
			const body = await res.json().catch(() => null);
			if (res.status === 429) {
				errorMsg = 'Rate limit hit (10 analyses/min) — wait a few seconds and retry.';
				status = 'error';
				return;
			}
			if (!res.ok || !body || typeof body !== 'object') {
				const code = body && typeof body.error === 'string' ? body.error : null;
				errorMsg =
					code === 'source_must_be_between_1_and_200000_characters'
						? 'Empty or oversized source — check the contract and retry.'
						: 'Analyzer rejected the request — check the contract and retry.';
				status = 'error';
				return;
			}
			const data = body as AnalyzeOk;
			findings = Array.isArray(data.findings) ? data.findings : [];
			summary = data.summary ?? null;
			pipeline = data.pipeline ?? null;
			status = 'done';
		} catch {
			errorMsg = 'Could not reach the analyzer worker — check your connection and retry.';
			status = 'error';
		}
	}

	function reset() {
		source = SAMPLE;
		wantPlan = true;
		findings = [];
		summary = null;
		pipeline = null;
		errorMsg = null;
		status = 'idle';
	}
</script>

<div class="lab-panel" aria-label="Viper-Web3 live analyzer">
	<div class="lab-head">
		<span class="lab-dot" class:off={!live} aria-hidden="true"></span>
		<span>{live ? '● LIVE — VIPER-WEB3' : '○ VIPER-WEB3 (CONNECTING…)'}</span>
		<a class="lab-link" href={VIPER_INFO_URL} target="_blank" rel="noopener noreferrer">API ↗</a>
	</div>

	<div class="lab-grid">
		<div class="lab-editor">
			<label for="viper-source">Solidity source</label>
			<textarea
				id="viper-source"
				bind:value={source}
				spellcheck={false}
				autocomplete="off"
				autocapitalize="off"
				placeholder="// paste a .sol contract here…"
				aria-describedby="viper-hint"
			></textarea>
			<div class="lab-actions">
				<button class="button primary" onclick={analyze} disabled={status === 'analyzing'}>
					{status === 'analyzing' ? 'Analyzing…' : 'Analyze contract'}
				</button>
				<button class="button ghost" onclick={reset} disabled={status === 'analyzing'}>Reset sample</button>
				<label class="plan-toggle">
					<input type="checkbox" bind:checked={wantPlan} />
					full audit plan
				</label>
			</div>
			<p class="hint" id="viper-hint">Heuristic triage + typed tool pipeline. 10 analyses/min/IP.</p>
		</div>

		<div class="lab-results" aria-live="polite">
			<div class="lab-results-head">
				<span>Findings</span>
				<strong>
					{#if status === 'analyzing'}SCANNING…
					{:else if summary}{summary.findingCount} FOUND · {summary.analyzedCharacters} CHARS
					{:else}AWAITING INPUT{/if}
				</strong>
			</div>

			{#if status === 'idle' || status === 'probing'}
				<p class="lab-empty">
					Hit <code>Analyze contract</code> to run the prefilled sample through a real
					edge worker — findings and the executable audit plan render here.
				</p>
			{:else if status === 'analyzing'}
				<p class="lab-empty">Scanning for tx.origin abuse, unsafe calls, delegatecall, selfdestruct…</p>
			{:else if status === 'error'}
				<div class="lab-error" role="alert">{errorMsg ?? 'Analysis failed.'}</div>
			{:else if status === 'done'}
				{#if findings.length === 0}
					<p class="lab-empty">
						<span class="status-ok">✓ CLEAN</span> — no heuristic findings in
						{summary?.analyzedCharacters ?? 0} characters. Heuristics are triage only;
						run Slither + Foundry + human review before mainnet.
					</p>
				{:else}
					<div class="findings">
						{#each findings as f (f.id)}
							<article class="finding {sevClass(f.severity)}">
								<span>{f.severity} · {f.id}</span>
								<strong>{f.title}</strong>
								<p>{f.recommendation}</p>
							</article>
						{/each}
					</div>
				{/if}

				{#if pipeline}
					<ul class="plan-steps" aria-label="Executable audit plan">
						{#each pipeline.steps as step (step.command.id)}
							<li>
								<b>{step.stage} → {step.command.bin}</b><br />
								<code>{step.command.args.join(' ')}</code>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.lab-dot.off {
		background: var(--warn);
		box-shadow: 0 0 12px var(--warn);
	}
	.plan-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font: 500 0.68rem var(--font-mono, monospace);
		color: var(--muted, #898681);
		cursor: pointer;
		text-transform: lowercase;
	}
	.plan-toggle input { accent-color: var(--accent, #a51d37); }
	.hint {
		margin: 0.75rem 0 0;
		font: 500 0.65rem var(--font-mono, monospace);
		color: var(--muted, #898681);
	}
	.status-ok {
		color: var(--ok, #35d07f);
		font: 700 0.72rem var(--font-mono, monospace);
		letter-spacing: 0.1em;
	}
	.plan-steps code {
		font-family: var(--font-mono, monospace);
		font-size: 0.72rem;
		color: var(--ink, #ece7e0);
		word-break: break-all;
	}
</style>
