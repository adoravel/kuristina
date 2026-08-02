/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type AsyncResult, map } from "@kuristina/core";
import type { LastFmImage } from "../types.ts";
import type { LastFmTrack } from "./track.ts";
import type { LastFmError } from "../errors.ts";
import { request } from "../http.ts";
import { getHighestQualityImage } from "./artist.ts";

export interface LastFmAlbum {
	name: string;
	mbid?: string;
	url: string;
	artist: string;
	image?: LastFmImage[];
	tracks?: { track: LastFmTrack[] };
	tags?: { tag: { name: string; url: string }[] };
	wiki?: { summary?: string; content?: string };
	userplaycount?: number;
}

export async function getAlbumInfo(
	artist: string,
	album: string,
	username?: string,
	autocorrect = true,
): AsyncResult<LastFmAlbum & { highestQualityImage: LastFmImage }, LastFmError> {
	const params: Record<string, string | number> = { artist, album };

	if (username) params.username = username;
	params.autocorrect = autocorrect ? 1 : 0;

	type Response = { album: LastFmAlbum };

	return map(await request<Response>("album.getInfo", params))(($) => ({
		...$.album,
		highestQualityImage: getHighestQualityImage($.album.image),
	}));
}
