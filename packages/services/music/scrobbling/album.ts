/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, mapAsync } from "@kuristina/core";
import { getAlbumInfo } from "@kuristina/services/music/last.fm";
import type { ScrobbleError, ScrobbleProviderName } from "@kuristina/services/music/scrobbling";

export interface ScrobbleAlbum {
	name: string;
	artist: string;
	href: string;
	imageUrl: string;
	tags?: { name: string; url?: string }[];
	bio?: string;
}

export interface ExtendedScrobbleAlbum extends ScrobbleAlbum {
	individualUserScrobbles: number;
}

export interface AlbumScrobbleProvider {
	readonly name: ScrobbleProviderName;

	getInfo(
		artist: string,
		album: string,
		exact: boolean,
		username: string,
	): AsyncResult<ExtendedScrobbleAlbum, ScrobbleError>;

	getInfo(
		artist: string,
		album: string,
		exact: boolean,
	): AsyncResult<ScrobbleAlbum, ScrobbleError>;
}

export class LastfmAlbumScrobbleProvider implements AlbumScrobbleProvider {
	readonly name = "lastfm" as ScrobbleProviderName;

	getInfo(
		artist: string,
		album: string,
		exact: boolean,
		username: string,
	): AsyncResult<ExtendedScrobbleAlbum, ScrobbleError>;
	getInfo(
		artist: string,
		album: string,
		exact: boolean,
	): AsyncResult<ScrobbleAlbum, ScrobbleError>;

	getInfo(
		artist: string,
		album: string,
		exact: boolean,
		username?: string,
	): AsyncResult<ScrobbleAlbum | ExtendedScrobbleAlbum, ScrobbleError> {
		if (username) {
			return mapAsync(getAlbumInfo(artist, album, username, !exact))(($) => ({
				name: $.name,
				artist: $.artist,
				href: $.url,
				bio: $.wiki?.summary,
				tags: $.tags?.tag,
				imageUrl: $.highestQualityImage["#text"],
				individualUserScrobbles: Number($.userplaycount ?? 0),
			}));
		}
		return mapAsync(getAlbumInfo(artist, album, undefined, !exact))(($) => ({
			name: $.name,
			artist: $.artist,
			href: $.url,
			tags: $.tags?.tag,
			bio: $.wiki?.summary || $.wiki?.content,
			imageUrl: $.highestQualityImage["#text"],
		}));
	}
}
