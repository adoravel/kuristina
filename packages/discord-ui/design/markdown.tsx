export type HeadingLevel = 1 | 2 | 3;

export const md = {
	heading: (text: string, level: HeadingLevel = 3): string => `${"#".repeat(level)} ${text}`,
	subtext: (text: string): string => `-# ${text}`,
	bold: (text: string): string => `**${text}**`,
	italic: (text: string): string => `*${text}*`,
	code: (text: string): string => `\`${text}\``,
	codeblock: (text: string, lang = ""): string => `\`\`\`${lang}\n${text}\n\`\`\``,
	quote: (text: string): string => text.split("\n").map((line) => `> ${line}`).join("\n"),
	link: (label: string, url: string): string => `[${label}](${url})`,
	list: (items: string[], bullet = "-#"): string =>
		items.map((item) => `${bullet} ${item}`).join("\n"),
} as const;
