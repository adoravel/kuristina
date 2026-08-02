/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, mapAsync } from "@kuristina/core";
import { getTrackInfo } from "@kuristina/services/lastfm";
import type { ScrobbleError, ScrobbleProviderName } from "@kuristina/services/scrobbling";

export interface ScrobbleTrackInfo {
	name: string;
	artist: string;
	href: string;
	imageUrl: string;
}

export interface ExtendedScrobbleTrackInfo extends ScrobbleTrackInfo {
	individualUserScrobbles: number;
}

export interface TrackScrobbleProvider {
	readonly name: ScrobbleProviderName;

	getInfo(
		artist: string,
		track: string,
		exact: boolean,
		username: string,
	): AsyncResult<ExtendedScrobbleTrackInfo, ScrobbleError>;

	getInfo(
		artist: string,
		track: string,
		exact: boolean,
	): AsyncResult<ScrobbleTrackInfo, ScrobbleError>;
}

export class LastfmTrackScrobbleProvider implements TrackScrobbleProvider {
	readonly name = "lastfm" as ScrobbleProviderName;

	getInfo(
		artist: string,
		track: string,
		exact: boolean,
		username: string,
	): AsyncResult<ExtendedScrobbleTrackInfo, ScrobbleError>;
	getInfo(
		artist: string,
		track: string,
		exact: boolean,
	): AsyncResult<ScrobbleTrackInfo, ScrobbleError>;

	getInfo(
		artist: string,
		track: string,
		exact: boolean,
		username?: string,
	): AsyncResult<ScrobbleTrackInfo | ExtendedScrobbleTrackInfo, ScrobbleError> {
		if (username) {
			return mapAsync(getTrackInfo(artist, track, username, !exact))(($) => ({
				name: $.name,
				artist: $.artist.name,
				href: $.url,
				imageUrl: $.highestQualityImage["#text"],
				individualUserScrobbles: Number($.userplaycount ?? 0),
			}));
		}
		return mapAsync(getTrackInfo(artist, track, undefined, !exact))(($) => ({
			name: $.name,
			artist: $.artist.name,
			href: $.url,
			imageUrl: $.highestQualityImage["#text"],
		}));
	}
}
