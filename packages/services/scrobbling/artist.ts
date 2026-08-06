/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, mapAsync } from "@kuristina/core";
import { getArtistInfo, withLastFmCache } from "@kuristina/services/lastfm";
import type { ScrobbleError, ScrobbleProviderName } from "@kuristina/services/scrobbling";

export interface ScrobbleArtist {
	name: string;
	href: string;
	bio?: string;
	tags?: { name: string; url?: string }[];
	imageUrl: string;
}

export interface ExtendedScrobbleArtist extends ScrobbleArtist {
	individualUserScrobbles: number;
}

export interface ArtistScrobbleProvider {
	readonly name: ScrobbleProviderName;

	getInfo(
		query: string,
		exact: boolean,
		username: string,
	): AsyncResult<ExtendedScrobbleArtist, ScrobbleError>;

	getInfo(
		query: string,
		exact: boolean,
	): AsyncResult<ScrobbleArtist, ScrobbleError>;
}

export class LastfmArtistScrobbleProvider implements ArtistScrobbleProvider {
	readonly name = "last.fm" as ScrobbleProviderName;

	getInfo(
		query: string,
		exact: boolean,
	): AsyncResult<ExtendedScrobbleArtist, ScrobbleError>;
	getInfo(
		artist: string,
		exact: boolean,
		username: string,
	): AsyncResult<ScrobbleArtist, ScrobbleError>;

	getInfo(
		query: string,
		exact: boolean,
		username?: string,
	): AsyncResult<ScrobbleArtist | ExtendedScrobbleArtist, ScrobbleError> {
		if (username) {
			return mapAsync(
				withLastFmCache("user_stats", "artist.getInfo", {
					artist: query,
					username,
					autocorrect: !exact,
				}, () => getArtistInfo(query, username, !exact)),
			)(($) => ({
				name: $.name,
				imageUrl: $.highestQualityImage["#text"],
				tags: $.tags?.tag,
				href: $.url,
				bio: $.bio?.summary,
				individualUserScrobbles: Number($.stats?.userplaycount ?? 0),
			}));
		}
		return mapAsync(
			withLastFmCache(
				"metadata",
				"artist.getInfo",
				{ artist: query, autocorrect: !exact },
				() => getArtistInfo(query, undefined, !exact),
			),
		)(($) => ({
			name: $.name,
			href: $.url,
			tags: $.tags?.tag,
			bio: $.bio?.summary ?? $.bio?.content,
			imageUrl: $.highestQualityImage["#text"],
		}));
	}
}
