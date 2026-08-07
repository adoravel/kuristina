/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, ok, tap } from "@kuristina/core";
import type { LastFmError } from "@kuristina/services/music/last.fm";
import { repositories } from "@kuristina/database";

export type CacheKind = "metadata" | "user_stats" | "recent_tracks";

const TTL_SECONDS: Record<CacheKind, number> = {
	metadata: 24 * 3600,
	user_stats: 15 * 60,
	recent_tracks: 60,
};

function cacheKey(method: string, params: Record<string, unknown>): string {
	const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
	return `${method}:${sorted}`;
}

export async function withLastFmCache<T>(
	kind: CacheKind,
	method: string,
	params: Record<string, unknown>,
	fetcher: () => AsyncResult<T, LastFmError>,
): AsyncResult<T, LastFmError> {
	const key = cacheKey(method, params);
	const cached = await repositories.lastfmCache.get<T>(key, TTL_SECONDS[kind]);
	if (cached.ok && cached.value !== null) return ok(cached.value);

	const fresh = await fetcher();
	return tap(fresh)(async ($) => await repositories.lastfmCache.set(key, $));
}

export async function invalidateLastFmCache(
	method: string,
	params: Record<string, unknown>,
): Promise<void> {
	await repositories.lastfmCache.delete(cacheKey(method, params));
}

export async function invalidateAllForUser(username: string): Promise<void> {
	await repositories.lastfmCache.deleteWhereKeyContains(username);
}
