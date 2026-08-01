import { type AsyncResult, mapAsync } from "@kuristina/core";
import { getArtistInfo } from "@kuristina/services/lastfm";
import type { ScrobbleError, ScrobbleProviderName } from "@kuristina/services/scrobbling";

export interface ScrobbleArtist {
	name: string;
	imageUrl: string;
}

export interface ExtendedScrobleArtist extends ScrobbleArtist {
	individualUserScrobbles: number;
}

export interface ArtistScrobbleProvider {
	readonly name: ScrobbleProviderName;

	getArtistInfo(
		query: string,
		exact: boolean,
		username: string,
	): AsyncResult<ExtendedScrobleArtist | undefined, ScrobbleError>;

	getArtistInfo(
		query: string,
		exact: boolean,
	): AsyncResult<ScrobbleArtist | undefined, ScrobbleError>;
}

export class LastfmArtistScrobbleProvider implements ArtistScrobbleProvider {
	readonly name = "lastfm" as ScrobbleProviderName;

	getArtistInfo(
		query: string,
		exact: boolean,
	): AsyncResult<ExtendedScrobleArtist | undefined, ScrobbleError>;
	getArtistInfo(
		artist: string,
		exact: boolean,
		username: string,
	): AsyncResult<ScrobbleArtist | undefined, ScrobbleError>;

	getArtistInfo(
		query: string,
		exact: boolean,
		username?: string,
	): AsyncResult<ScrobbleArtist | ExtendedScrobleArtist | undefined, ScrobbleError> {
		if (username) {
			return mapAsync(getArtistInfo(query, username, exact))(($) => ({
				name: $.name,
				imageUrl: $.highestQualityImage["#text"],
				individualUserScrobbles: Number($.stats?.userplaycount ?? 0),
			}));
		}
		return mapAsync(getArtistInfo(query, undefined, exact))(($) => ({
			name: $.name,
			imageUrl: $.highestQualityImage["#text"],
		}));
	}
}
