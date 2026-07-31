export type HeadingLevel = 1 | 2 | 3;

export const md = {
	heading: (text: string, level: HeadingLevel = 3): string => `${"#".repeat(level)} ${text}`,
	subtext: (text: string): string => text.split("\n").map((line) => `-# ${line}`).join("\n"),
	bold: (text: string): string => `**${text.replaceAll("**", "\\*\\*")}**`,
	italic: (text: string): string => `*${text.replaceAll("*", "\\*")}*`,
	code: (text: string): string => {
		const matches = text.match(/`+/g);
		const maxLen = matches ? Math.max(...matches.map((m) => m.length)) : 0;
		const delimiter = "`".repeat(maxLen + 1);
		const padding = text.startsWith("`") || text.endsWith("`") ? " " : "";
		return `${delimiter}${padding}${text}${padding}${delimiter}`;
	},
	codeblock: (text: string, lang = ""): string => {
		const safeText = text.replaceAll("```", "\\`\\`\\`");
		return `\`\`\`${lang}\n${safeText}\n\`\`\``;
	},
	quote: (text: string): string => text.split("\n").map((line) => `> ${line}`).join("\n"),
	link: (label: string, url: string): string => {
		const safeLabel = label.replaceAll("]", "\\]");
		const safeUrl = url.replaceAll(")", "%29");
		return `[${safeLabel}](${safeUrl})`;
	},
	list: (items: string[], bullet = "-"): string =>
		items.map((item) => `${bullet} ${item.replaceAll("\n", "\n  ")}`).join("\n"),
	orderedList: (items: string[]): string =>
		items.map((item, i) => {
			const prefix = `${i + 1}. `;
			const indent = " ".repeat(prefix.length);
			return `${prefix}${item.replaceAll("\n", `\n${indent}`)}`;
		}).join("\n"),
	strikethrough: (text: string): string => `~~${text.replaceAll("~~", "\\~\\~")}~~`,
	underline: (text: string): string => `__${text.replaceAll("__", "\\_\\_")}__`,
	spoiler: (text: string): string => `||${text.replaceAll("||", "\\|\\|")}||`,
} as const;

export type IntrinsicTagProps = Record<string, unknown> & { children?: unknown };

export const intrinsicTags: Record<string, (text: string, props: IntrinsicTagProps) => string> = {
	strong: (t) => md.bold(t),
	b: (t) => md.bold(t),
	em: (t) => md.italic(t),
	i: (t) => md.italic(t),
	code: (t) => md.code(t),
	kbd: (t) => md.code(t),
	pre: (t, props) => md.codeblock(t, typeof props.lang === "string" ? props.lang : ""),
	blockquote: (t) => md.quote(t),
	q: (t) => md.quote(t),
	sub: (t) => md.subtext(t),
	h1: (t) => md.heading(t, 1),
	h2: (t) => md.heading(t, 2),
	h3: (t) => md.heading(t, 3),
	a: (t, props) => md.link(t, typeof props.href === "string" ? props.href : ""),
	del: (t) => md.strikethrough(t),
	s: (t) => md.strikethrough(t),
	u: (t) => md.underline(t),
	spoiler: (t) => md.spoiler(t),
};
