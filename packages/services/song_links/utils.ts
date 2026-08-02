/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

const MUSIC_URL_PATTERN =
	/https?:\/\/(?:open\.spotify\.com|music\.apple\.com|music\.youtube\.com|www\.youtube\.com\/watch|tidal\.com\/browse|music\.amazon\.[\w.]+|www\.deezer\.com|soundcloud\.com)\/\S+/g;

export function normaliseSongUrl(raw: string): string {
	try {
		const url = new URL(raw);
		[...url.searchParams.keys()]
			.filter((k) => k === "si" || k.startsWith("utm_") || k === "context")
			.forEach((k) => url.searchParams.delete(k));
		return url.toString();
	} catch {
		return raw;
	}
}

export function extractMusicUrls(content: string): string[] {
	return [...content.matchAll(MUSIC_URL_PATTERN)].map((m) => m[0]);
}
