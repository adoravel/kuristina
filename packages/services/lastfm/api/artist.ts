/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, map } from "@kuristina/core";
import type { LastFmError } from "../errors.ts";
import type { LastFmImage } from "../types.ts";
import { request } from "../http.ts";

export interface LastFmArtistSummary {
	name: string;
	mbid?: string;
	url: string;
	"#text"?: string;
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

const FALLBACK_IMAGE: LastFmImage = {
	"#text": "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png",
	size: "mega",
};

export function getHighestQualityImage(images?: LastFmImage[]): LastFmImage {
	if (!images || images.length === 0) return FALLBACK_IMAGE;

	const sizePriority = ["mega", "extralarge", "large", "medium", "small", ""] as const;
	return sizePriority
		.map((size) => images.find((img) => img.size === size))
		.find((img) => img?.["#text"]) ?? FALLBACK_IMAGE;
}

export async function getArtistInfo(
	artist: string,
	username?: string,
	autocorrect = true,
): AsyncResult<LastFmArtist & { highestQualityImage: LastFmImage }, LastFmError> {
	const params: Record<string, string | number> = { artist };

	if (username) params.username = username;
	params.autocorrect = autocorrect ? 1 : 0;

	type Response = { artist: LastFmArtist };

	return map(await request<Response>("artist.getInfo", params))(($) => ({
		...$.artist,
		highestQualityImage: getHighestQualityImage($.artist.image),
	}));
}
