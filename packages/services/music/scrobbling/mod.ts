/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { LastFmError } from "../lastfm/errors.ts";

import { type ArtistScrobbleProvider, LastfmArtistScrobbleProvider } from "./artist.ts";
import { type AlbumScrobbleProvider, LastfmAlbumScrobbleProvider } from "./album.ts";
import { LastfmTrackScrobbleProvider, type TrackScrobbleProvider } from "./track.ts";

export type ScrobbleProviderName = "last.fm" | "listenbrainz";
export type ScrobbleError = LastFmError;

export interface ScrobbleProvider {
	readonly name: ScrobbleProviderName;

	artist: ArtistScrobbleProvider;
	album: AlbumScrobbleProvider;
	track: TrackScrobbleProvider;
}

const providers: Partial<Record<ScrobbleProviderName, ScrobbleProvider>> = {
	"last.fm": {
		name: "last.fm",
		artist: new LastfmArtistScrobbleProvider(),
		album: new LastfmAlbumScrobbleProvider(),
		track: new LastfmTrackScrobbleProvider(),
	},
};

export function getScrobbleProvider(name: ScrobbleProviderName): ScrobbleProvider {
	const provider = providers[name];
	if (!provider) throw new Error(`scrobble provider "${name}" is not yet implemented`);
	return provider;
}

export * from "./artist.ts";
export * from "./album.ts";
export * from "./track.ts";
