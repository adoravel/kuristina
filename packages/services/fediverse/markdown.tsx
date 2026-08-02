/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { intrinsicTags, md } from "@kuristina/discord-ui";

type TagProps = Record<string, string>;

interface TagContext {
	readonly tagName: string;
	readonly props: TagProps;
	readonly contentBuffer: string;
}

interface ParserState {
	readonly stack: readonly TagContext[];
	readonly output: string;
}

const decodeEntities = (html: string): string => {
	const entities: Record<string, string> = {
		"&lt;": "<",
		"&gt;": ">",
		"&amp;": "&",
		"&quot;": '"',
		"&#39;": "'",
		"&apos;": "'",
		"&nbsp;": " ",
	};
	return html.replace(/&[a-z0-9#]+;/gi, (match) => entities[match.toLowerCase()] || match);
};

const parseAttributes = (tagString: string): TagProps => {
	const props: Record<string, string> = {};
	const attrRegex = /([a-zA-Z0-9:-]+)=["']([^"']*)["']/g;
	let match: RegExpExecArray | null;

	while ((match = attrRegex.exec(tagString)) !== null) {
		props[match[1]] = match[2];
	}
	return props;
};

const appendText = (state: ParserState, text: string): ParserState => {
	if (state.stack.length === 0) {
		return { ...state, output: state.output + text };
	}

	const head = state.stack[state.stack.length - 1];
	const newHead = { ...head, contentBuffer: head.contentBuffer + text };
	return {
		...state,
		stack: [...state.stack.slice(0, -1), newHead],
	};
};

const formatTag = (tagName: string, props: TagProps, innerText: string): string => {
	if (tagName === "a") {
		const href = props.href || "";
		const isMention = (props.class || "").includes("mention");

		if (isMention) {
			return md.link(`${innerText} ↗`, href);
		}
		if (innerText.trim() === href.trim()) {
			return href;
		}

		return md.link(`${innerText} ↗`, href);
	}

	if (tagName in intrinsicTags) {
		return intrinsicTags[tagName](innerText, props);
	}

	if (tagName === "p") {
		return `${innerText}\n\n`;
	}
	if (tagName === "br") {
		return `${innerText}\n`;
	}

	return innerText;
};

const handleClosingTag = (state: ParserState, tagName: string): ParserState => {
	const index = state.stack.map((t) => t.tagName).lastIndexOf(tagName);
	if (index === -1) return state;

	const closedTag = state.stack[index];
	const newStack = state.stack.filter((_, i) => i !== index);
	const processedText = formatTag(tagName, closedTag.props, closedTag.contentBuffer);

	return appendText({ ...state, stack: newStack }, processedText);
};

const handleOpeningTag = (state: ParserState, token: string, tagName: string): ParserState => {
	if (token.endsWith("/>") || tagName === "br") {
		return appendText(state, "\n");
	}

	const newContext: TagContext = {
		tagName,
		props: parseAttributes(token),
		contentBuffer: "",
	};
	return { ...state, stack: [...state.stack, newContext] };
};

const handleTextToken = (state: ParserState, token: string): ParserState => {
	if (/^\n+$/.test(token)) {
		return appendText(state, token);
	}

	const activeTag = state.stack[state.stack.length - 1];
	const isHidden = activeTag && (activeTag.props.class || "").includes("invisible");

	if (isHidden) return state;

	return appendText(state, decodeEntities(token));
};

const processToken = (state: ParserState, token: string): ParserState => {
	if (!token) return state;

	if (token.startsWith("<") && token.endsWith(">")) {
		const isClosing = token.startsWith("</");
		const tagNameMatch = token.match(/<\/?([a-zA-Z0-9:-]+)/);
		const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : "";

		return isClosing ? handleClosingTag(state, tagName) : handleOpeningTag(state, token, tagName);
	}

	return handleTextToken(state, token);
};

const flushRemainingStack = (state: ParserState): string =>
	state.stack.reduceRight((acc, current) => acc + current.contentBuffer, state.output);

export function htmlToDiscordMarkdown(html: string): string {
	if (!html) return "";

	const tagRegex = /(<\/?[a-zA-Z0-9:-]+(?:\s+[^>]*?)?>|\n+)/g;
	const tokens = html.split(tagRegex);

	const initialState: ParserState = { stack: [], output: "" };
	const finalState = tokens.reduce(processToken, initialState);

	return flushRemainingStack(finalState).trim();
}
