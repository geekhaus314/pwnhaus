/**
 * Typed command architecture.
 *
 * Every tool call is its own object with typed fields — never a flat
 * "command line string". Argument values travel as their own variables
 * (each arg semantically distinct, numbers stay numbers), so downstream
 * runners can quote, escape, or execute with full fidelity instead of
 * re-parsing a concatenated string.
 */

export type CommandArg = string | number;

export interface Command {
	/** Stable identifier for the tool invocation. */
	readonly id: string;
	/** Executable (resolved from PATH) or absolute path. Never a shell line. */
	readonly bin: string;
	/** Each argument is its own typed value; never joined into one string. */
	readonly args: readonly CommandArg[];
	/** Environment overrides for this invocation only. */
	readonly env?: Readonly<Record<string, string>>;
	/** Working directory for the invocation. */
	readonly cwd?: string;
	/** Hard kill after this many milliseconds. */
	readonly timeoutMs?: number;
	/** Markers expected in the tail of stdout/stderr when the command succeeds. */
	readonly success?: readonly string[];
}

export interface CommandStep {
	/** Pipeline stage this command belongs to (recon, parse, compile, test...). */
	readonly stage: string;
	readonly command: Command;
}

export interface CommandPlan {
	readonly toolchain: string;
	readonly targets: readonly string[];
	readonly steps: readonly CommandStep[];
}

// ---------------------------------------------------------------------------
// Builders — one per tool. Each returns a typed Command; argument order and
// types are explicit at the call site.
// ---------------------------------------------------------------------------

const arr = (args: readonly CommandArg[]): string[] =>
	args.map((a) => (typeof a === 'number' ? String(a) : a));

const soliditySourceArg = (source: string): string => source;

export const solcCompile = (version: string, source: string): Command => ({
	id: 'solc-compile',
	bin: 'solc',
	args: ['--standard-json', '--allow-paths', source],
	env: { SOLC_VERSION: version },
	timeoutMs: 120_000,
	success: ['errors', 'compiler']
});

export const forgeBuild = (projectDir: string): Command => ({
	id: 'forge-build',
	bin: 'forge',
	args: ['build', '--json'],
	cwd: projectDir,
	timeoutMs: 180_000,
	success: ['Compiling', 'Success']
});

export const forgeTest = (projectDir: string, match: string): Command => ({
	id: 'forge-test',
	bin: 'forge',
	args: ['test', '--match-test', match],
	cwd: projectDir,
	timeoutMs: 300_000,
	success: ['Suite result: ok']
});

export const hevmTest = (source: string, version: string): Command => ({
	id: 'hevm-test',
	bin: 'hevm',
	args: ['test', '--code', soliditySourceArg(source)],
	env: { SOLC_VERSION: version },
	timeoutMs: 180_000,
	success: ['Pass']
});

export const slitherAnalyze = (projectDir: string): Command => ({
	id: 'slither-analyze',
	bin: 'slither',
	args: ['.', '--json', projectDir + '/slither-report.json'],
	cwd: projectDir,
	timeoutMs: 240_000,
	success: ['ERROR', 'DONE']
});

export const mythrilCheck = (bytecode: string, timeoutSeconds: number): Command => ({
	id: 'mythril-check',
	bin: 'mythril',
	args: ['analyze', '--execution-timeout', timeoutSeconds, '--code', bytecode],
	timeoutMs: timeoutSeconds * 1000 + 30_000,
	success: ['Analysis result']
});

/**
 * The audit pipeline Viper can execute against a Solidity source.
 * Each stage is its own Command; no stage is baked into a string.
 */
export const viperAuditPlan = (source: string, version: string): CommandPlan => ({
	toolchain: 'viper-web3',
	targets: ['linearize compile', 'hevm symbolic test', 'slither static', 'mythril deep'],
	steps: [
		{ stage: 'compile', command: solcCompile(version, source) },
		{ stage: 'test', command: hevmTest(source, version) },
		{ stage: 'static', command: slitherAnalyze('.') },
		{ stage: 'deep', command: mythrilCheck('__VIOLIN__', 60) }
	]
});

export const argList = arr;