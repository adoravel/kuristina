/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { err, fetchWithRetry, ok, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import { MUSIC_PLATFORMS, type MusicLinkResult, type MusicPlatform } from "./types.ts";

interface OdesliResponse {
	entityUniqueId: string;
	linksByPlatform: Record<string, { url: string }>;
	entitiesByUniqueId: Record<string, { title: string; artistName?: string; thumbnailUrl?: string }>;
}

export async function resolveViaOdesli(
	url: string,
): Promise<Result<MusicLinkResult, NetworkError>> {
	const apiUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(url)}`;
	const result = await fetchWithRetry<OdesliResponse>(apiUrl, {
		retry: { maxAttempts: 3, baseDelayMs: 500 },
	});
	if (!result.ok) return result;

	const entity = result.value.entitiesByUniqueId[result.value.entityUniqueId];
	if (!entity) return err(Errors.network("Odesli returned no matching entity for this link"));

	const links: Partial<Record<MusicPlatform, string>> = {};
	for (const platform of MUSIC_PLATFORMS) {
		const entry = result.value.linksByPlatform[platform];
		if (entry) links[platform] = entry.url;
	}

	return ok({
		title: entity.title,
		artist: entity.artistName,
		thumbnailUrl: entity.thumbnailUrl,
		links,
		source: "odesli" as const,
	});
}
