/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const pattern = /https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_\.]+)\/status\/(\d+)/g;

export function extractStatusUrls(content: string): string[] {
	const matches = content.matchAll(pattern);
	const results: string[] = [];

	for (const match of matches) {
		let url = match[0];

		const remaining = content.substring(match.index! + url.length);
		if (remaining.startsWith("?")) {
			continue;
		}

		const nextChar = remaining[0];
		if (nextChar === "/" || nextChar === "&") {
			const restMatch = /^[\/\&][^\s]*/.exec(remaining);
			if (restMatch) {
				url += restMatch[0];
			}
		}

		results.push(url);
	}

	return results;
}

export function parseStatusUrl(url: string): { handle: string; id: string } | undefined {
	try {
		if (url.endsWith("?") || url.endsWith("?/")) {
			return undefined;
		}

		const parsed = new URL(url.split("?")[0]);

		if (!["twitter.com", "x.com"].includes(parsed.hostname)) {
			return undefined;
		}
		const pathParts = parsed.pathname.split("/").filter(Boolean);

		if (pathParts.length < 3 || pathParts[1] !== "status") {
			return undefined;
		}
		const handle = pathParts[0];
		const id = pathParts[2];

		if (!handle || !id || !/^\d+$/.test(id)) {
			return undefined;
		}

		return { handle, id };
	} catch {
		return undefined;
	}
}

export function hasStatusUrls(content: string): boolean {
	return extractStatusUrls(content).length > 0;
}

export function extractFirstStatusUrl(content: string): string | undefined {
	const urls = extractStatusUrls(content);
	return urls[0];
}

export function normaliseStatusUrl(handle: string, id: string): string {
	return `https://twitter.com/${handle}/status/${id}`;
}

export function isValidStatusUrl(url: string): boolean {
	return parseStatusUrl(url) !== undefined;
}
