/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { Result } from "@kuristina/core";
import type { LastFmError } from "../lastfm/errors.ts";
import { getArtistInfoForUser } from "../lastfm/api/artist.ts";

export type ScrobbleProviderName = "lastfm" | "listenbrainz";
export type ScrobbleError = LastFmError;

export interface ScrobbleProvider {
	readonly name: ScrobbleProviderName;

	getArtistPlaycount(
		username: string,
		artist: string,
	): Promise<Result<number | undefined, ScrobbleError>>;
}

const lastfm: ScrobbleProvider = {
	name: "lastfm",
	async getArtistPlaycount(username, artist) {
		const result = await getArtistInfoForUser(artist, username);
		if (!result.ok) return result;
		return { ok: true, value: result.value.stats?.userplaycount };
	},
};

const providers: Partial<Record<ScrobbleProviderName, ScrobbleProvider>> = { lastfm };

export function getScrobbleProvider(name: ScrobbleProviderName): ScrobbleProvider {
	const provider = providers[name];
	if (!provider) throw new Error(`scrobble provider "${name}" is not yet implemented`);
	return provider;
}
