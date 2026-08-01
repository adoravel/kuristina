/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { LastFmError } from "../lastfm/errors.ts";

import { type ArtistScrobbleProvider, LastfmArtistScrobbleProvider } from "./artist.ts";

export type ScrobbleProviderName = "lastfm" | "listenbrainz";
export type ScrobbleError = LastFmError;

export interface ScrobbleProvider {
	readonly name: ScrobbleProviderName;

	artist: ArtistScrobbleProvider;
}

const lastfm: ScrobbleProvider = {
	name: "lastfm",
	artist: new LastfmArtistScrobbleProvider(),
};

const providers: Partial<Record<ScrobbleProviderName, ScrobbleProvider>> = { lastfm };

export function getScrobbleProvider(name: ScrobbleProviderName): ScrobbleProvider {
	const provider = providers[name];
	if (!provider) throw new Error(`scrobble provider "${name}" is not yet implemented`);
	return provider;
}

export * from "./artist.ts";
