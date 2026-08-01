/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type AsyncResult, mapAsync } from "@kuristina/core";
import { getArtistInfo } from "@kuristina/services/lastfm";
import type { ScrobbleError, ScrobbleProviderName } from "@kuristina/services/scrobbling";

export interface ScrobbleArtist {
	name: string;
	href: string;
	tags?: { name: string; url?: string }[];
	imageUrl: string;
}

export interface ExtendedScrobleArtist extends ScrobbleArtist {
	individualUserScrobbles: number;
}

export interface ArtistScrobbleProvider {
	readonly name: ScrobbleProviderName;

	getInfo(
		query: string,
		exact: boolean,
		username: string,
	): AsyncResult<ExtendedScrobleArtist, ScrobbleError>;

	getInfo(
		query: string,
		exact: boolean,
	): AsyncResult<ScrobbleArtist, ScrobbleError>;
}

export class LastfmArtistScrobbleProvider implements ArtistScrobbleProvider {
	readonly name = "lastfm" as ScrobbleProviderName;

	getInfo(
		query: string,
		exact: boolean,
	): AsyncResult<ExtendedScrobleArtist, ScrobbleError>;
	getInfo(
		artist: string,
		exact: boolean,
		username: string,
	): AsyncResult<ScrobbleArtist, ScrobbleError>;

	getInfo(
		query: string,
		exact: boolean,
		username?: string,
	): AsyncResult<ScrobbleArtist | ExtendedScrobleArtist, ScrobbleError> {
		if (username) {
			return mapAsync(getArtistInfo(query, username, !exact))(($) => ({
				name: $.name,
				imageUrl: $.highestQualityImage["#text"],
				tags: $.tags?.tag,
				href: $.url,
				individualUserScrobbles: Number($.stats?.userplaycount ?? 0),
			}));
		}
		return mapAsync(getArtistInfo(query, undefined, !exact))(($) => ({
			name: $.name,
			href: $.url,
			tags: $.tags?.tag,
			imageUrl: $.highestQualityImage["#text"],
		}));
	}
}
