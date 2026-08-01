/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { fetchWithRetry, ok, type Result } from "@kuristina/core";
import type { NetworkError } from "@kuristina/core";

const BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "kuristina/0.1.0 (https://kyu.re/~kuristina)";

export interface MusicBrainzArtist {
	id: string;
	name: string;
	score: number;
	disambiguation?: string;
}

export async function searchArtist(
	name: string,
): Promise<Result<MusicBrainzArtist | undefined, NetworkError>> {
	const url = new URL(`${BASE}/artist`);
	url.searchParams.set("query", `artist:"${name}"`);
	url.searchParams.set("fmt", "json");
	url.searchParams.set("limit", "1");

	const result = await fetchWithRetry<{ artists: MusicBrainzArtist[] }>(url.toString(), {
		headers: { "User-Agent": USER_AGENT },
		retry: { maxAttempts: 5, baseDelayMs: 1100 },
	});
	if (!result.ok) return result;
	return ok(result.value.artists[0]);
}

export async function correctArtistName(name: string): Promise<string> {
	const result = await searchArtist(name);
	if (!result.ok || !result.value || result.value.score < 90) return name;
	return result.value.name;
}
