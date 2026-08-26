import { commands, helpLines, profile, type TerminalLine } from '../../data/profile';

export const prompt = 'pwn4g3@portfolio:~$';

export const executeCommand = (rawInput: string, context?: { setTheme?: (name: string) => boolean }): TerminalLine[] => {
	const [name = '', ...args] = rawInput.toLowerCase().split(/\s+/);
	if (name === 'help') return helpLines();
	if (name === 'clear') return [];

	const commandName = Object.entries(commands).find(([key, command]) => key === name || command.aliases?.includes(name))?.[0];
	const command = commandName ? commands[commandName] : undefined;
	return command
		? command.run(args, profile, context)
		: [{ text: `command not found: ${rawInput}. Try "help".`, type: 'error' }];
};
