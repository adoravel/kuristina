/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const pattern = /https?:\/\/([\w.-]+)\/@([\w.-]+)\/(\d+)/g;

export function extractFediUrls(content: string): string[] {
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

export function parseFediUrl(url: string): { instance: string; id: string } | undefined {
	try {
		if (url.endsWith("?") || url.endsWith("?/")) {
			return undefined;
		}

		const parsed = new URL(url.split("?")[0]);
		const pathParts = parsed.pathname.split("/").filter(Boolean);

		if (pathParts.length < 2) {
			return undefined;
		}

		const handle = pathParts[0].startsWith("@") ? pathParts[0].slice(1) : pathParts[0];
		const id = pathParts[1];

		if (!handle || !id || !/^\d+$/.test(id)) {
			return undefined;
		}

		return {
			instance: parsed.hostname,
			id,
		};
	} catch {
		return undefined;
	}
}

export function hasFediUrls(content: string): boolean {
	return extractFediUrls(content).length > 0;
}

export function extractFirstFediUrl(content: string): string | undefined {
	const urls = extractFediUrls(content);
	return urls[0];
}

export function normaliseFediUrl(instance: string, handle: string, id: string): string {
	return `https://${instance}/@${handle}/${id}`;
}

export function isValidFediUrl(url: string): boolean {
	return parseFediUrl(url) !== undefined;
}
