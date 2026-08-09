/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, ok } from "@kuristina/core";
import type { NetworkError } from "@kuristina/core";
import type { SqlError } from "@kuristina/database";
import { repositories } from "@kuristina/database";
import { getAlbumInfo } from "../lastfm/api/album.ts";
import { getTrackInfo } from "../lastfm/api/track.ts";
import { searchRelease } from "../brainz/mod.ts";
import type { LastFmError } from "../lastfm/errors.ts";

export interface MusicMetadata {
	description?: string;
	releaseDate?: string;
}

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function getMusicMetadata(
	artist: string,
	title: string,
	kind: "song" | "album",
): AsyncResult<MusicMetadata, NetworkError | LastFmError | SqlError> {
	const cacheKey = `music-meta:${kind}:${artist.toLowerCase()}:${title.toLowerCase()}`;
	const cached = await repositories.cache.get<MusicMetadata>(cacheKey, CACHE_TTL_SECONDS);
	if (cached.ok && cached.value) return ok(cached.value);

	const [descriptionResult, releaseResult] = await Promise.all([
		kind === "album" ? getAlbumInfo(artist, title) : getTrackInfo(artist, title),
		searchRelease(artist, title),
	]);

	const meta: MusicMetadata = {};

	if (descriptionResult.ok) {
		const wiki = descriptionResult.value.wiki;
		if (wiki?.summary) meta.description = wiki.summary;
	}
	if (releaseResult.ok && releaseResult.value?.date) {
		meta.releaseDate = releaseResult.value.date;
	}

	await repositories.cache.set(cacheKey, meta);
	return ok(meta);
}
