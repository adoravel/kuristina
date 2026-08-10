/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const pattern =
	/https?:\/\/(?:bsky\.app|witchsky\.app|deer\.social|catsky\.social)\/profile\/([\w.:-]+)\/post\/([\w]+)/g;

const ALLOWED_HOSTS = new Set(["bsky.app", "witchsky.app", "deer.social", "catsky.social"]);

export function extractBskyUrls(content: string): string[] {
	return [...content.matchAll(pattern)].map((m) => m[0]);
}

export function parseBskyUrl(url: string): { handle: string; rkey: string } | undefined {
	try {
		const parsed = new URL(url);
		if (!ALLOWED_HOSTS.has(parsed.hostname)) return undefined;

		const parts = parsed.pathname.split("/").filter(Boolean);
		if (parts.length < 4 || parts[0] !== "profile" || parts[2] !== "post") return undefined;

		return { handle: parts[1], rkey: parts[3] };
	} catch {
		return undefined;
	}
}
