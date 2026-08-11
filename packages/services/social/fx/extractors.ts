/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const TWITTER_PATTERN =
	/https?:\/\/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_\.]+)\/status\/(\d+)(?:\/([a-zA-Z-]+))?/g;
export const TWITTER_HOSTS = new Set(["twitter.com", "x.com"]);

export function extractTwitterUrls(content: string): string[] {
	return [...content.matchAll(TWITTER_PATTERN)].map((m) => m[0]);
}

export function parseTwitterUrl(
	url: string,
): { handle: string; id: string; lang?: string } | undefined {
	try {
		const parsed = new URL(url);
		if (!TWITTER_HOSTS.has(parsed.hostname)) return undefined;

		const parts = parsed.pathname.split("/").filter(Boolean);
		if (parts.length < 3 || parts[1] !== "status") return undefined;

		const handle = parts[0];
		const id = parts[2];
		const lang = parts[3];

		if (!handle || !id || handle.length > 15 || !/^\d+$/.test(id)) return undefined;

		if (lang && !/^[a-z]{2}(-[A-Z]{2})?$/.test(lang)) {
			return undefined;
		}

		return { handle, id, lang };
	} catch {
		return undefined;
	}
}

const BSKY_PATTERN =
	/https?:\/\/(?:bsky\.app|witchsky\.app|deer\.social|catsky\.social)\/profile\/([\w.:-]+)\/post\/([\w]+)/g;
export const BSKY_HOSTS = new Set(["bsky.app", "witchsky.app", "deer.social", "catsky.social"]);

export function extractBskyUrls(content: string): string[] {
	return [...content.matchAll(BSKY_PATTERN)].map((m) => m[0]);
}

export function parseBskyUrl(url: string): { handle: string; rkey: string } | undefined {
	try {
		const parsed = new URL(url);
		if (!BSKY_HOSTS.has(parsed.hostname)) return undefined;

		const parts = parsed.pathname.split("/").filter(Boolean);
		if (parts.length < 4 || parts[0] !== "profile" || parts[2] !== "post") return undefined;

		return { handle: parts[1], rkey: parts[3] };
	} catch {
		return undefined;
	}
}

const LANGUAGE_ALIASES: Record<string, string> = {
	en: "en",
	fr: "fr",
	pl: "pl",
	ru: "ru",
	es: "es-ES",
	"es-es": "es-ES",
	vi: "vi",
	cn: "zh-CN",
	"zh-cn": "zh-CN",
	tw: "zh-TW",
	"zh-tw": "zh-TW",
	pt: "pt-BR",
	"pt-br": "pt-BR",
	ja: "ja",
	jp: "ja",
};

const SUPPORTED_LANGS = new Set(Object.values(LANGUAGE_ALIASES));

export function parseLanguage(input: string): string | undefined {
	const norm = input.trim().toLowerCase();
	const alias = LANGUAGE_ALIASES[norm];
	if (alias) return alias;
	if (SUPPORTED_LANGS.has(norm)) return norm;
	return undefined;
}
