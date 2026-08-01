/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type AsyncResult, map } from "@kuristina/core";
import type { LastFmError } from "../errors.ts";
import type { LastFmImage } from "../types.ts";
import { request } from "../http.ts";

export interface LastFmArtistSummary {
	name: string;
	mbid?: string;
	url: string;
}

export interface LastFmArtist {
	name: string;
	mbid?: string;
	url: string;
	image?: LastFmImage[];
	stats?: {
		listeners?: number;
		playcount?: number;
		userplaycount?: number;
	};
	bio?: {
		summary?: string;
		content?: string;
	};
	similar?: { artist: LastFmArtistSummary[] };
	tags?: { tag: { name: string; url: string }[] };
}

export async function getArtistInfo(
	artist: string,
	username?: string,
	autocorrect = false,
): AsyncResult<LastFmArtist, LastFmError> {
	const params: Record<string, string | number> = { artist };

	if (username) params.username = username;
	if (autocorrect) params.autocorrect = 1;

	type Response = { artist: LastFmArtist };

	return map(await request<Response>("artist.getInfo", params))(($) => $.artist);
}

/**
 * get artist info for a specific user, including playcount
 */
export function getArtistInfoForUser(
	artist: string,
	username: string,
): AsyncResult<LastFmArtist, LastFmError> {
	return getArtistInfo(artist, username);
}
