/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { fetchWithRetry } from "@kuristina/core";

interface ItunesResponse {
	results: { trackViewUrl: string }[];
}

export async function findAppleMusicUrl(
	title: string,
	artist?: string,
): Promise<string | undefined> {
	const term = [artist, title].filter(Boolean).join(" ");
	const apiUrl = `https://itunes.apple.com/search?term=${
		encodeURIComponent(term)
	}&entity=song&limit=1`;
	const result = await fetchWithRetry<ItunesResponse>(apiUrl, {
		retry: { maxAttempts: 2, baseDelayMs: 500 },
	});
	return result.ok ? result.value.results[0]?.trackViewUrl : undefined;
}
