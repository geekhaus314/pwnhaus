import { jsonResponse, handleOptions } from '../../shared/cors';
import { rateLimitOr429 } from '../../shared/rate-limit';
import { viperAuditPlan } from '../../shared/commands';

interface ViperFinding {
	id: string;
	severity: 'high' | 'medium' | 'low' | 'info';
	title: string;
	recommendation: string;
	swc?: string;
	function?: string;
	lines?: number[];
	excerpt?: string;
}

interface FuncInfo {
	name: string;
	params: string;
	modifiers: string;
	header: string;
	body: string;
	bodyStart: number;
	bodyEnd: number;
	startLine: number;
	endLine: number;
}

// ---------------------------------------------------------------------------
// Solidity-aware preprocessing: strip comments + string literals while
// preserving offsets and newlines, so `// tx.origin` or `"...call..."` in
// a string never fires a detector. Everything below matches on `clean`.
// ---------------------------------------------------------------------------

const stripSolidity = (src: string): { clean: string; lines: string[] } => {
	const lines = src.split('\n');
	const out = new Array<string>(src.length);
	let i = 0;
	let state: 'code' | 'line' | 'block' | 'dstr' | 'sstr' = 'code';
	while (i < src.length) {
		const c = src[i];
		const n = i + 1 < src.length ? src[i + 1] : '';
		if (state === 'code') {
			if (c === '/' && n === '/') {
				state = 'line';
				out[i] = ' ';
				out[i + 1] = ' ';
				i += 2;
				continue;
			}
			if (c === '/' && n === '*') {
				state = 'block';
				out[i] = ' ';
				out[i + 1] = ' ';
				i += 2;
				continue;
			}
			if (c === '"') {
				state = 'dstr';
				out[i] = ' ';
				i += 1;
				continue;
			}
			if (c === "'") {
				state = 'sstr';
				out[i] = ' ';
				i += 1;
				continue;
			}
			out[i] = c;
			i += 1;
			continue;
		}
		if (state === 'line') {
			if (c === '\n') {
				state = 'code';
				out[i] = '\n';
			} else {
				out[i] = ' ';
			}
			i += 1;
			continue;
		}
		if (state === 'block') {
			if (c === '*' && n === '/') {
				state = 'code';
				out[i] = ' ';
				out[i + 1] = ' ';
				i += 2;
				continue;
			}
			out[i] = c === '\n' ? '\n' : ' ';
			i += 1;
			continue;
		}
		if (state === 'dstr') {
			if (c === '\\' && i + 1 < src.length) {
				out[i] = ' ';
				out[i + 1] = src[i + 1] === '\n' ? '\n' : ' ';
				i += 2;
				continue;
			}
			if (c === '"') {
				state = 'code';
				out[i] = ' ';
				i += 1;
				continue;
			}
			out[i] = c === '\n' ? '\n' : ' ';
			i += 1;
			continue;
		}
		// sstr
		if (c === '\\' && i + 1 < src.length) {
			out[i] = ' ';
			out[i + 1] = src[i + 1] === '\n' ? '\n' : ' ';
			i += 2;
			continue;
		}
		if (c === "'") {
			state = 'code';
			out[i] = ' ';
			i += 1;
			continue;
		}
		out[i] = c === '\n' ? '\n' : ' ';
		i += 1;
	}
	return { clean: out.join(''), lines };
};

const buildLineStarts = (s: string): number[] => {
	const starts = [0];
	for (let k = 0; k < s.length; k++) if (s[k] === '\n') starts.push(k + 1);
	return starts;
};

const offsetToLine = (offset: number, starts: number[]): number => {
	let lo = 0;
	let hi = starts.length - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (starts[mid] <= offset) lo = mid;
		else hi = mid - 1;
	}
	return lo + 1; // 1-indexed
};

const excerptFor = (lines: string[], lineNo: number): string => {
	const raw = (lines[lineNo - 1] ?? '').trim().replace(/\s+/g, ' ');
	return raw.length > 160 ? raw.slice(0, 157) + '...' : raw;
};

const parseFunctions = (clean: string, starts: number[]): FuncInfo[] => {
	const funcs: FuncInfo[] = [];
	const pushWithBody = (name: string, params: string, modifiers: string, header: string, braceIdx: number, headerStart: number) => {
		let depth = 1;
		let j = braceIdx + 1;
		while (j < clean.length && depth > 0) {
			if (clean[j] === '{') depth++;
			else if (clean[j] === '}') depth--;
			j++;
		}
		const bodyEnd = j - 1;
		const body = clean.slice(braceIdx + 1, bodyEnd);
		funcs.push({
			name,
			params,
			modifiers,
			header,
			body,
			bodyStart: braceIdx + 1,
			bodyEnd,
			startLine: offsetToLine(headerStart, starts),
			endLine: offsetToLine(bodyEnd, starts)
		});
	};
	const fnRe = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*([^{;]*)\{/g;
	let m: RegExpExecArray | null;
	while ((m = fnRe.exec(clean)) !== null) {
		pushWithBody(m[1], m[2], m[3], m[0], m.index + m[0].length - 1, m.index);
		if (funcs.length > 400) break;
	}
	const specialRe = /\b(constructor|fallback|receive)\s*(\([^)]*\))?\s*([^{;]*)\{/g;
	while ((m = specialRe.exec(clean)) !== null) {
		pushWithBody(m[1], m[2] ?? '', m[3] ?? '', m[0], m.index + m[0].length - 1, m.index);
		if (funcs.length > 500) break;
	}
	return funcs;
};

const AUTH_RE = /onlyOwner|onlyRole|onlyAdmin|requiresAuth|_checkOwner|hasRole\s*\(|accessControl/i;
const SENDER_CHECK_RE = /require\s*\(\s*(msg\.sender|owner)\s*==|require\s*\(\s*hasRole|if\s*\(\s*(msg\.sender|owner)\s*!=\s*[^)]+\)\s*revert|_checkOwner\s*\(/;
const WEAK_ORIGIN_CHECK_RE = /require\s*\(\s*tx\.origin\s*==|if\s*\(\s*tx\.origin\s*!=\s*[^)]+\)\s*revert/;
const GUARD_RE = /nonReentrant|ReentrancyGuard/;
const VIEW_PURE_RE = /\b(view|pure)\b/;

const hasAuth = (f: FuncInfo): boolean =>
	AUTH_RE.test(f.modifiers) || SENDER_CHECK_RE.test(f.body) || WEAK_ORIGIN_CHECK_RE.test(f.body);
const hasGuard = (f: FuncInfo): boolean => GUARD_RE.test(f.modifiers) || GUARD_RE.test(f.body);
const isViewPure = (f: FuncInfo): boolean => VIEW_PURE_RE.test(f.modifiers);

const STATE_WRITE_RE = /([A-Za-z_$][\w$]*(?:\s*\[[^\]]*\])?(?:\s*\.\s*[A-Za-z_$][\w$]*)?\s*(=|\+=|-=|\*=|\/=|%=|\|=|&=|\^=|<<=|>>=)(?![=>])|\.push\s*\(|\bdelete\s+[A-Za-z])/;
const EXT_CALL_RE = /\.(call\s*(\{[^}]*\})?\s*\(|send\s*\(|transfer\s*\(|delegatecall\s*\(|staticcall\s*\()/;

const paramNames = (params: string): string[] =>
	params
		.split(',')
		.map((p) => p.trim().split(/\s+/).pop() ?? '')
		.filter((p) => /^[A-Za-z_$][\w$]*$/.test(p));

const findEnclosing = (funcs: FuncInfo[], offset: number): FuncInfo | null => {
	for (const f of funcs) if (offset >= f.bodyStart && offset <= f.bodyEnd) return f;
	return null;
};

const SEV_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, info: 3 };

const analyzeSolidity = (source: string): ViperFinding[] => {
	const { clean, lines } = stripSolidity(source);
	const starts = buildLineStarts(clean);
	const funcs = parseFunctions(clean, starts);
	const out: ViperFinding[] = [];
	const seen = new Set<string>();

	const push = (f: ViperFinding) => {
		const key = `${f.id}|${f.function ?? ''}|${(f.lines ?? []).join(',')}`;
		if (seen.has(key)) return;
		seen.add(key);
		if (out.length < 40) out.push(f);
	};

	const lineOf = (off: number): number => offsetToLine(off, starts);

	// --- 1. tx.origin (SWC-115) ---
	{
		const re = /\btx\.origin\b/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(clean)) !== null) {
			const ln = lineOf(m.index);
			const fn = findEnclosing(funcs, m.index);
			push({
				id: 'tx-origin',
				severity: 'high',
				swc: 'SWC-115',
				function: fn?.name,
				lines: [ln],
				excerpt: excerptFor(lines, ln),
				title: 'tx.origin is used for authorization',
				recommendation: 'Use msg.sender for authorization. tx.origin is phishable through an intermediate contract.'
			});
			if (out.length >= 40) break;
		}
	}

	// --- 2. selfdestruct (SWC-106) ---
	{
		const re = /\bselfdestruct\s*\(/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(clean)) !== null) {
			const ln = lineOf(m.index);
			const fn = findEnclosing(funcs, m.index);
			const prot = fn ? hasAuth(fn) : false;
			push({
				id: 'selfdestruct',
				severity: prot ? 'medium' : 'high',
				swc: 'SWC-106',
				function: fn?.name,
				lines: [ln],
				excerpt: excerptFor(lines, ln),
				title: prot ? 'selfdestruct is present (access-controlled — verify)' : 'Unprotected selfdestruct',
				recommendation: 'Confirm destruction is required, protect with onlyOwner/onlyRole + timelock, and check beneficiary cannot be manipulated.'
			});
		}
	}

	// --- 3. delegatecall (SWC-112) + arbitrary target ---
	{
		const re = /\.delegatecall\s*\(/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(clean)) !== null) {
			const ln = lineOf(m.index);
			const fn = findEnclosing(funcs, m.index);
			push({
				id: 'delegatecall',
				severity: 'high',
				swc: 'SWC-112',
				function: fn?.name,
				lines: [ln],
				excerpt: excerptFor(lines, ln),
				title: 'delegatecall can execute code in the caller context',
				recommendation: 'Pin implementation to an immutable/allowlisted address, restrict callers, and document storage-layout + upgrade assumptions.'
			});
		}
		// arbitrary target: receiver identifier comes from params
		const recvRe = /([A-Za-z_$][\w$]*)\s*\.\s*delegatecall\s*\(/g;
		let r: RegExpExecArray | null;
		while ((r = recvRe.exec(clean)) !== null) {
			const fn = findEnclosing(funcs, r.index);
			if (!fn) continue;
			if (paramNames(fn.params).includes(r[1])) {
				push({
					id: 'delegatecall-arbitrary',
					severity: 'high',
					swc: 'SWC-112',
					function: fn.name,
					lines: [lineOf(r.index)],
					excerpt: excerptFor(lines, lineOf(r.index)),
					title: `delegatecall target '${r[1]}' is user-controlled`,
					recommendation: 'Do not delegatecall to calldata-supplied addresses. Allowlist implementations or remove the path.'
				});
			}
		}
	}

	// --- 4. Real reentrancy: external call before state write, no guard (SWC-107) ---
	for (const fn of funcs) {
		if (isViewPure(fn)) continue;
		if (/^(constructor|receive|fallback)$/.test(fn.name) && !EXT_CALL_RE.test(fn.body)) continue;
		const callIdx = fn.body.search(EXT_CALL_RE);
		if (callIdx < 0) continue;
		const after = fn.body.slice(callIdx + 1);
		const writeRel = after.search(STATE_WRITE_RE);
		if (writeRel < 0) continue;
		if (hasGuard(fn)) continue;
		const absCall = fn.bodyStart + callIdx;
		const absWrite = fn.bodyStart + callIdx + 1 + writeRel;
		push({
			id: 'reentrancy-eth',
			severity: 'high',
			swc: 'SWC-107',
			function: fn.name,
			lines: [lineOf(absCall), lineOf(absWrite)],
			excerpt: excerptFor(lines, lineOf(absCall)),
			title: `Possible reentrancy in ${fn.name}: external call before state update, no nonReentrant`,
			recommendation: 'Apply checks-effects-interactions (update state before call), add ReentrancyGuard, and prefer pull-payments.'
		});
	}
	// guard-missing info when native ETH calls exist but no guard at all
	// (ERC20 transfer/transferFrom alone do not need a reentrancy guard signal)
	{
		const nativeCall = /\.call\s*(\{|\()|\.send\s*\(|\.delegatecall\s*\(|\.staticcall\s*\(/.test(clean);
		const nativeTransferRe = /\.transfer\s*\([^,();]*\)/g;
		let nativeTransfer = false;
		let tm: RegExpExecArray | null;
		while ((tm = nativeTransferRe.exec(clean)) !== null) {
			const ln = lineOf(tm.index);
			const lt = lines[ln - 1] ?? '';
			if (/safeTransfer/.test(lt)) continue;
			nativeTransfer = true;
			break;
		}
		const anyGuard = GUARD_RE.test(clean);
		if ((nativeCall || nativeTransfer) && !anyGuard) {
			push({
				id: 'reentrancy-guard-missing',
				severity: 'low',
				swc: 'SWC-107',
				title: 'External calls exist but no ReentrancyGuard found',
				recommendation: 'Add OpenZeppelin ReentrancyGuard to state-changing functions that call untrusted contracts, even if ordering looks safe.'
			});
		}
	}

	// --- 5. Unchecked low-level call return (SWC-104) ---
	{
		const re = /\.call\s*(?:\{[^}]*\})?\s*\(/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(clean)) !== null) {
			const ln = lineOf(m.index);
			const lineText = lines[ln - 1] ?? '';
			if (/sendValue|functionCall|safeTransfer|Address\s*\./.test(lineText)) continue;
			const fn = findEnclosing(funcs, m.index);
			const scope = fn ? clean.slice(m.index, Math.min(fn.bodyEnd, m.index + 1200)) : clean.slice(m.index, m.index + 600);
			// If the scope contains require/if/assert on the return var, treat as handled.
			const hasCheck = /require\s*\([^;]*(ok|success|sent)|if\s*\([^;]*(ok|success|sent)|assert\s*\([^;]*(ok|success)/.test(scope);
			const assigned = /=\s*[^;]*\.call\s*(\{|\( )/.test(clean.slice(Math.max(0, m.index - 120), m.index + 10)) || /\(\s*bool\s+\w+/.test(clean.slice(Math.max(0, m.index - 120), m.index));
			if (!hasCheck) {
				push({
					id: 'unchecked-call',
					severity: 'high',
					swc: 'SWC-104',
					function: fn?.name,
					lines: [ln],
					excerpt: excerptFor(lines, ln),
					title: assigned ? 'Low-level call return value is not checked' : 'Low-level call without return-value handling',
					recommendation: 'Capture (bool ok,) and require(ok), or use OpenZeppelin Address.sendValue / safe low-level wrappers.'
				});
			}
		}
	}

	// --- 6. Arbitrary call target / ether to arbitrary address ---
	{
		const recvRe = /([A-Za-z_$][\w$]*)\s*\.\s*call\s*(?:\{[^}]*\})?\s*\(/g;
		let r: RegExpExecArray | null;
		while ((r = recvRe.exec(clean)) !== null) {
			const fn = findEnclosing(funcs, r.index);
			if (!fn) continue;
			if (!paramNames(fn.params).includes(r[1])) continue;
			const ln = lineOf(r.index);
			push({
				id: 'call-target-arbitrary',
				severity: 'high',
				function: fn.name,
				lines: [ln],
				excerpt: excerptFor(lines, ln),
				title: `Low-level call target '${r[1]}' comes from function parameters`,
				recommendation: 'Allowlist call targets or restrict the function. Arbitrary call targets enable theft / delegatecall-style takeovers.'
			});
			if (/\{\s*value\s*:/.test(clean.slice(Math.max(0, r.index - 4), r.index + 80))) {
				push({
					id: 'ether-to-arbitrary',
					severity: 'high',
					function: fn.name,
					lines: [ln],
					excerpt: excerptFor(lines, ln),
					title: `Ether sent to user-supplied address '${r[1]}'`,
					recommendation: 'Validate recipient (zero-address, allowlist, pull-payment) and add reentrancy + access-control checks.'
				});
			}
		}
	}

	// --- 7. Access-control missing on privileged functions ---
	{
		const SENSITIVE_FN_RE = /mint|withdraw|claim|redeem|burn|drain|sweep|pause|unpause|upgrade|setOwner|transferOwnership|renounce|kill|destroy|rescue/i;
		const SENSITIVE_OP_RE = /selfdestruct\s*\(|delegatecall\s*\(|upgradeTo\s*\(|setImplementation\s*\(|_mint\s*\(|_burn\s*\(|\.call\s*(\{[^}]*value[^}]*\})?\s*\(/;
		for (const fn of funcs) {
			if (isViewPure(fn)) continue;
			if (!/\b(public|external)\b/.test(fn.modifiers) && !/^(fallback|receive)$/.test(fn.name)) {
				// internal/private still interesting only if reachable; skip to cut noise
				if (!SENSITIVE_FN_RE.test(fn.name)) continue;
			}
			const sensitiveName = SENSITIVE_FN_RE.test(fn.name);
			const sensitiveOp = SENSITIVE_OP_RE.test(fn.body);
			if (!sensitiveName && !sensitiveOp) continue;
			if (hasAuth(fn)) continue;
			// Permissionless-by-design: signature / merkle-gated claims are not missing auth.
			if (/\becrecover\s*\(|MerkleProof\s*\.\s*verify|_hashTypedData|domainSeparator/.test(fn.body)) continue;
			// Self-withdraw pattern (sends to msg.sender, no arbitrary recipient param) is not a privileged drain.
			const sendsToSelf = /payable\s*\(\s*msg\.sender\s*\)|msg\.sender\s*\.\s*(call|send|transfer)\b/.test(fn.body);
			const hasRecipientParam = /(address\s+(calldata\s+|memory\s+)?(to|recipient|receiver|dest|target|beneficiary|account|user|wallet)\b)/i.test(fn.params);
			const onlyValueCall =
				sensitiveOp &&
				!/selfdestruct\s*\(|delegatecall\s*\(|upgradeTo\s*\(|setImplementation\s*\(|_mint\s*\(|_burn\s*\(/.test(fn.body);
			if (onlyValueCall && sendsToSelf && !hasRecipientParam && !sensitiveName) continue;
			push({
				id: 'access-control-missing',
				severity: 'high',
				swc: 'SWC-105',
				function: fn.name,
				lines: [fn.startLine],
				excerpt: excerptFor(lines, fn.startLine),
				title: `Function ${fn.name} performs privileged action without access control`,
				recommendation: 'Add onlyOwner/onlyRole or an explicit require(msg.sender == ...) gate, and test unauthorized calls revert.'
			});
		}
	}

	// --- 8. Signature replay / ecrecover without nonce ---
	if (/\becrecover\s*\(/.test(clean)) {
		const protectedRe = /nonce|nonces\s*\[|_used|used[A-Za-z]*\s*\[|mapping[^;]*bool[^;]*used|domainSeparator|_hashTypedData|EIP712|invalidat/i;
		if (!protectedRe.test(clean)) {
			const idx = clean.search(/\becrecover\s*\(/);
			push({
				id: 'signature-replay',
				severity: 'medium',
				swc: 'SWC-121',
				function: findEnclosing(funcs, idx)?.name,
				lines: [lineOf(idx)],
				excerpt: excerptFor(lines, lineOf(idx)),
				title: 'ecrecover without visible replay protection (nonce / used-map / EIP-712)',
				recommendation: 'Bind each signature to nonce + chainid + contract + deadline, mark used before external calls, and use EIP-712 typed data.'
			});
		}
	}

	// --- 9. Initializer / upgradeable risks ---
	if (/\binitialize\s*\(/.test(clean) || /\binitializer\b/.test(clean)) {
		const hasDisabler = /_disableInitializers|constructor\s*\([^)]*\)[^{]*\{[^}]*_disableInitializers/.test(clean);
		for (const fn of funcs) {
			if (!/initialize/i.test(fn.name) && !/initializer/.test(fn.modifiers)) continue;
			if (hasAuth(fn)) continue;
			push({
				id: 'initializer-unprotected',
				severity: hasDisabler ? 'low' : 'medium',
				function: fn.name,
				lines: [fn.startLine],
				excerpt: excerptFor(lines, fn.startLine),
				title: `Initializer ${fn.name} lacks access control`,
				recommendation: 'Restrict who can initialize, call _disableInitializers() in the constructor, and test re-initialization reverts.'
			});
			break;
		}
		if (!hasDisabler && /Initializable|UUPS|TransparentUpgradeableProxy|ERC1967/i.test(clean)) {
			push({
				id: 'upgradeable-no-disable',
				severity: 'low',
				title: 'Upgradeable contract without _disableInitializers in constructor',
				recommendation: 'Add `constructor() { _disableInitializers(); }` so the implementation cannot be initialized directly.'
			});
		}
	}
	if (/\bupgradeTo\s*\(|\bsetImplementation\s*\(|\bupgradeProxy\s*\(/.test(clean)) {
		const idx = clean.search(/\bupgradeTo\s*\(|\bsetImplementation\s*\(/);
		const fn = findEnclosing(funcs, idx);
		if (!fn || !hasAuth(fn)) {
			push({
				id: 'upgrade-to-unprotected',
				severity: 'high',
				function: fn?.name,
				lines: [lineOf(idx)],
				excerpt: excerptFor(lines, lineOf(idx)),
				title: 'Proxy upgrade path without visible access control',
				recommendation: 'Gate upgradeTo/setImplementation with onlyOwner + timelock/multisig and emit an event.'
			});
		}
	}

	// --- 10. ERC20 approval patterns ---
	if (/\.approve\s*\(/.test(clean)) {
		const idx = clean.search(/\.approve\s*\(/);
		const infinite = /approve\s*\([^,]+,\s*(type\s*\(\s*uint256\s*\)\s*\.\s*max|uint256\s*\(\s*-1\s*\)|2\s*\*\*\s*256\s*-\s*1)/.test(clean);
		push({
			id: infinite ? 'infinite-approval' : 'approval-race',
			severity: infinite ? 'low' : 'medium',
			swc: 'SWC-114',
			function: findEnclosing(funcs, idx)?.name,
			lines: [lineOf(idx)],
			excerpt: excerptFor(lines, lineOf(idx)),
			title: infinite ? 'Infinite ERC20 approval (type(uint256).max)' : 'ERC20 approve() front-running surface',
			recommendation: infinite
				? 'Prefer exact allowances or time-boxed permits (permit2 / EIP-2612) over infinite approvals.'
				: 'Set allowance to 0 before changing non-zero to non-zero, or use safeIncreaseAllowance / permit.'
		});
	}

	// --- 11. Unchecked ERC20 transfer return (2-arg transfer / 3-arg transferFrom only;
	// single-arg `.transfer(x)` is native ETH and reverts — not an ERC20 finding) ---
	{
		const re = /\.transfer\s*\(|\.transferFrom\s*\(/g;
		let m: RegExpExecArray | null;
		let flagged = 0;
		while ((m = re.exec(clean)) !== null) {
			// Count top-level commas to separate native (1 arg) from ERC20 (2-3 args)
			let depth = 0;
			let commas = 0;
			let j = m.index + m[0].length;
			for (; j < Math.min(clean.length, m.index + 600) && depth >= 0; j++) {
				const c = clean[j];
				if (c === '(') depth++;
				else if (c === ')') {
					if (depth === 0) break;
					depth--;
				} else if (c === ',' && depth === 0) commas++;
				if (c === ';') break;
			}
			if (commas === 0) continue; // native ETH transfer — reverts on failure
			const ln = lineOf(m.index);
			const lineText = lines[ln - 1] ?? '';
			if (/safeTransfer|safeTransferFrom|require\s*\(|assert\s*\(|if\s*\(|return\s+.*transfer/.test(lineText)) continue;
			// `require(token.transfer(...))` split across lines: check enclosing call context
			const ctx = clean.slice(Math.max(0, m.index - 200), m.index);
			if (/require\s*\(\s*$|return\s*$|if\s*\(\s*$/.test(ctx)) continue;
			const fn = findEnclosing(funcs, m.index);
			push({
				id: 'erc20-unchecked-transfer',
				severity: 'medium',
				function: fn?.name,
				lines: [ln],
				excerpt: excerptFor(lines, ln),
				title: 'ERC20 transfer/transferFrom return value not checked',
				recommendation: 'Use SafeERC20 safeTransfer/safeTransferFrom or require(token.transfer(...)) — some tokens return false instead of reverting.'
			});
			if (++flagged >= 3) break;
		}
	}

	// --- 12. Missing zero-address check ---
	for (const fn of funcs) {
		const params = paramNames(fn.params).filter((p) => /^(to|recipient|receiver|dest|target|beneficiary|owner|admin|addr|account|user|wallet)$/i.test(p));
		if (params.length === 0) continue;
		const bodyNoDelegate = fn.body.replace(/\.delegatecall\s*\(/g, ' ').replace(/\.staticcall\s*\(/g, ' ');
		if (!/(transfer|send|\.call\s*(\{[^}]*\})?\s*\(|mint|approve|safeTransfer)/.test(bodyNoDelegate)) continue;
		if (/!=\s*address\s*\(\s*0\s*\)|==\s*address\s*\(\s*0\s*\)\s*revert|require\s*\([^;]*address\s*\(\s*0\s*\)/.test(fn.body)) continue;
		push({
			id: 'zero-address-missing',
			severity: 'low',
			function: fn.name,
			lines: [fn.startLine],
			excerpt: excerptFor(lines, fn.startLine),
			title: `No zero-address validation for address parameter in ${fn.name}`,
			recommendation: 'require(to != address(0)) before transfers/mints to avoid burns to the zero address.'
		});
		if (out.length >= 40) break;
	}

	// --- 13. block.timestamp (SWC-116) ---
	{
		const re = /\bblock\.timestamp\b|\bnow\b/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(clean)) !== null) {
			const ln = lineOf(m.index);
			push({
				id: 'block-timestamp',
				severity: 'medium',
				swc: 'SWC-116',
				function: findEnclosing(funcs, m.index)?.name,
				lines: [ln],
				excerpt: excerptFor(lines, ln),
				title: 'Block timestamp influences behavior',
				recommendation: 'Miners can skew timestamps ~15s. Do not use for randomness; use 2-step deadlines for critical windows.'
			});
			break; // one representative finding; per-line spam adds no signal
		}
	}

	// --- 14. Weak randomness ---
	{
		const re = /\bblockhash\s*\(|block\.prevrandao|block\.difficulty|block\.coinbase|block\.gaslimit/g;
		const m = re.exec(clean);
		if (m) {
			push({
				id: 'weak-randomness',
				severity: 'medium',
				swc: 'SWC-120',
				function: findEnclosing(funcs, m.index)?.name,
				lines: [lineOf(m.index)],
				excerpt: excerptFor(lines, lineOf(m.index)),
				title: 'On-chain randomness source is manipulable',
				recommendation: 'Use Chainlink VRF or commit-reveal. blockhash/prevrandao/coinbase are miner-influenced.'
			});
		}
	}

	// --- 15. Spot-price oracle ---
	if (/getReserves\s*\(|getAmountsOut\s*\(|getAmountOut\s*\(/.test(clean)) {
		const idx = clean.search(/getReserves\s*\(|getAmountsOut\s*\(|getAmountOut\s*\(/);
		push({
			id: 'price-oracle-spot',
			severity: 'medium',
			function: findEnclosing(funcs, idx)?.name,
			lines: [lineOf(idx)],
			excerpt: excerptFor(lines, lineOf(idx)),
			title: 'Spot DEX price used on-chain (manipulable in one block)',
			recommendation: 'Use TWAP / Chainlink feeds with staleness + deviation checks, not instantaneous reserves/quotes.'
		});
	} else if (/address\s*\(\s*this\s*\)\s*\.balance\b/.test(clean) && /\/|\+|\*|>\s*\d|mint|price|amount|reward|share/i.test(clean)) {
		const idx = clean.search(/address\s*\(\s*this\s*\)\s*\.balance/);
		push({
			id: 'price-oracle-balance',
			severity: 'medium',
			function: findEnclosing(funcs, idx)?.name,
			lines: [lineOf(idx)],
			excerpt: excerptFor(lines, lineOf(idx)),
			title: 'Contract balance used to price shares/rewards (donation-inflation risk)',
			recommendation: 'Track internal accounting (totalShares/totalAssets) instead of address(this).balance; guard against donation attacks.'
		});
	}

	// --- 16. Strict equality on balance ---
	{
		const m = /address\s*\(\s*this\s*\)\s*\.balance\s*==|\.balance\s*==\s*\d/.exec(clean);
		if (m) {
			push({
				id: 'strict-equality-balance',
				severity: 'low',
				function: findEnclosing(funcs, m.index)?.name,
				lines: [lineOf(m.index)],
				excerpt: excerptFor(lines, lineOf(m.index)),
				title: 'Strict equality on ether balance',
				recommendation: 'Anyone can force-feed ether (selfdestruct/coinbase). Use >= / accounting instead of ==.'
			});
		}
	}

	// --- 17. Unbounded loop DoS (SWC-128) ---
	for (const fn of funcs) {
		const loopRe = /\b(for|while)\s*\(/g;
		let lm: RegExpExecArray | null;
		let hit = false;
		while ((lm = loopRe.exec(fn.body)) !== null) {
			const window = fn.body.slice(lm.index, lm.index + 2500);
			if (/\.(call\s*(\{[^}]*\})?\s*\(|send\s*\(|transfer\s*\(|transferFrom\s*\()|\.push\s*\(/.test(window) && /\.length\b/.test(window)) {
				const abs = fn.bodyStart + lm.index;
				push({
					id: 'unbounded-loop-dos',
					severity: 'medium',
					swc: 'SWC-128',
					function: fn.name,
					lines: [lineOf(abs)],
					excerpt: excerptFor(lines, lineOf(abs)),
					title: `Unbounded loop in ${fn.name} with external calls / pushes`,
					recommendation: 'Bound iterations (pagination / pull-patterns), avoid state-changing external calls inside loops over dynamic arrays.'
				});
				hit = true;
				break;
			}
		}
		if (hit) break;
	}

	// --- 18. unchecked{} math ---
	if (/\bunchecked\s*\{/.test(clean)) {
		const idx = clean.search(/\bunchecked\s*\{/);
		push({
			id: 'unchecked-math',
			severity: 'low',
			function: findEnclosing(funcs, idx)?.name,
			lines: [lineOf(idx)],
			excerpt: excerptFor(lines, lineOf(idx)),
			title: 'unchecked{} arithmetic disables overflow checks',
			recommendation: 'Prove no overflow/underflow with invariants + fuzz tests, or remove unchecked.'
		});
	}

	// --- 19. Floating / outdated pragma ---
	{
		const pm = /pragma\s+solidity\s+([^;]+);/.exec(clean);
		if (pm) {
			const ver = pm[1];
			const floating = /\^|>=/.test(ver);
			const ancient = /0\.[1-7]\./.test(ver) && !/SafeMath|using\s+\w+\s+for\s+uint/.test(clean);
			if (floating || ancient) {
				push({
					id: 'pragma-version',
					severity: 'low',
					swc: 'SWC-103',
					lines: [lineOf(pm.index)],
					excerpt: excerptFor(lines, lineOf(pm.index)),
					title: floating ? 'Floating pragma allows untested compiler versions' : 'Pre-0.8 Solidity without SafeMath',
					recommendation: floating ? 'Pin to one tested version (e.g. pragma solidity 0.8.20;).' : 'Upgrade to ^0.8 or explicitly use SafeMath.'
				});
			}
		}
	}

	// --- 20. Inline assembly ---
	{
		const m = /\bassembly\s*(\{|\(|\"|memory-safe)/.exec(clean);
		if (m) {
			push({
				id: 'assembly-use',
				severity: 'info',
				function: findEnclosing(funcs, m.index)?.name,
				lines: [lineOf(m.index)],
				excerpt: excerptFor(lines, lineOf(m.index)),
				title: 'Inline assembly present — manual review required',
				recommendation: 'Check memory safety, free-memory pointer, and that high-level invariants still hold.'
			});
		}
	}

	// --- 21. Missing events on privileged state changes ---
	for (const fn of funcs) {
		if (isViewPure(fn)) continue;
		if (!hasAuth(fn) && !/owner|admin|pause|mint|upgrade|set[A-Z]/i.test(fn.name)) continue;
		if (!STATE_WRITE_RE.test(fn.body)) continue;
		if (/\bemit\b/.test(fn.body)) continue;
		push({
			id: 'missing-events',
			severity: 'info',
			function: fn.name,
			lines: [fn.startLine],
			excerpt: excerptFor(lines, fn.startLine),
			title: `Privileged state change in ${fn.name} emits no event`,
			recommendation: 'Emit an event for off-chain monitoring and incident response.'
		});
		if (out.filter((f) => f.id === 'missing-events').length >= 2) break;
	}

	// --- 22. Centralization: owner-set-to-deployer + drain ---
	if (/\bowner\s*=\s*msg\.sender\b/.test(clean) || /Ownable/.test(clean)) {
		if (/withdraw|drain|sweep|rescue|selfdestruct/.test(clean)) {
			push({
				id: 'centralization-drain',
				severity: 'info',
				title: 'Single-EOA owner can move/destroy funds',
				recommendation: 'Use multisig + timelock for ownership, document trust assumptions.'
			});
		}
	}

	out.sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9) || (a.lines?.[0] ?? 1e9) - (b.lines?.[0] ?? 1e9));
	return out;
};

export default {
	async fetch(request: Request): Promise<Response> {
		const preflight = handleOptions(request);
		if (preflight) return preflight;

		const url = new URL(request.url);

		if (url.pathname === '/api/viper-web3') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'viper-info' }, 405);
			const limited = rateLimitOr429(
				request,
				{ limit: 60, windowMs: 60_000, prefix: 'viper-info' },
				'viper-info'
			);
			if (limited) return limited;
			return jsonResponse({
				service: 'viper-web3',
				status: 'available',
				mode: 'read-only-audit',
				network: 'chain-agnostic',
				endpoints: { analyze: 'POST /api/viper-web3/analyze', plan: 'POST /api/viper-web3/analyze?plan=1' },
				disclaimer: 'Heuristic triage only; run Foundry, Slither, Mythril, and human review for an audit.',
				note: 'Internal service, reached via the pwn4g3 gateway.'
			});
		}

		if (url.pathname === '/api/viper-web3/analyze') {
			if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed', route: 'viper-analyze' }, 405);

			// Expensive route: 10 analyses/min per client IP.
			const limited = rateLimitOr429(
				request,
				{ limit: 10, windowMs: 60_000, prefix: 'viper-analyze' },
				'viper-analyze'
			);
			if (limited) return limited;

			let body: unknown;
			try {
				body = await request.json();
			} catch {
				return jsonResponse({ error: 'invalid_json' }, 400);
			}
			if (!body || typeof body !== 'object' || !('source' in body) || typeof body.source !== 'string') {
				return jsonResponse({ error: 'source_string_required' }, 400);
			}
			const source = body.source;
			if (source.length === 0 || source.length > 200_000) {
				return jsonResponse({ error: 'source_must_be_between_1_and_200000_characters' }, 413);
			}
			const wantPlan = 'plan' in body && body.plan === true;

			const findings = analyzeSolidity(source);
			return jsonResponse({
				service: 'viper-web3',
				mode: 'read-only-audit',
				findings,
				summary: { findingCount: findings.length, analyzedCharacters: source.length },
				...(wantPlan
					? {
							pipeline: viperAuditPlan(source, '0.8.20')
						}
					: {})
			});
		}

		if (url.pathname === '/health') {
			if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed', route: 'health' }, 405);
			return jsonResponse({ service: 'viper-web3', status: 'ok' });
		}

		return jsonResponse({ error: 'not_found' }, 404);
	}
}