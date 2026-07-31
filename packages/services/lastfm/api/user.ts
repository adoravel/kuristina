/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import type { LastFmError } from "../errors.ts";
import type { LastFmTrack } from "./track.ts";
import type { LastFmArtistSummary } from "./artist.ts";
import { request } from "../http.ts";

export interface LastFmRecentTracks {
	track: LastFmTrack[];
	"@attr": {
		user: string;
		totalPages: number;
		page: number;
		perPage: number;
		total: number;
	};
}

export interface LastFmLovedTracks {
	track: LastFmTrack[];
	"@attr": Record<string, number | string>;
}

export interface LastFmTopArtists {
	artist: LastFmArtistSummary[];
	"@attr": Record<string, number | string>;
}

export async function getRecentTracks(
	username: string,
	options?: {
		limit?: number;
		page?: number;
		from?: number;
		to?: number;
		extended?: boolean;
	},
): Promise<Result<LastFmRecentTracks, LastFmError>> {
	const params: Record<string, string | number> = { user: username };

	if (options?.limit) params.limit = Math.min(Math.max(options.limit, 0), 50);
	if (options?.page) params.page = options.page;
	if (options?.from) params.from = options.from;
	if (options?.to) params.to = options.to;
	if (options?.extended) params.extended = 1;

	const result = await request<{ recenttracks: LastFmRecentTracks }>(
		"user.getRecentTracks",
		params,
	);
	if (!result.ok) return result;

	return ok(result.value.recenttracks);
}

export async function getTopArtists(
	username: string,
	options?: {
		limit?: number;
		page?: number;
		period?: "overall" | "7day" | "1month" | "3month" | "6month" | "12month";
	},
): Promise<Result<LastFmTopArtists, LastFmError>> {
	const params: Record<string, string | number> = { user: username };
	if (options?.limit) params.limit = options.limit;
	if (options?.page) params.page = options.page;
	if (options?.period) params.period = options.period;

	const result = await request<{ topartists: LastFmTopArtists }>("user.getTopArtists", params);
	if (!result.ok) return result;

	return ok(result.value.topartists);
}

export async function getLovedTracks(
	username: string,
	options?: { limit?: number; page?: number },
): Promise<Result<LastFmLovedTracks, LastFmError>> {
	const params: Record<string, string | number> = { user: username };
	if (options?.limit) params.limit = options.limit;
	if (options?.page) params.page = options.page;

	const result = await request<{ lovedtracks: LastFmLovedTracks }>("user.getLovedTracks", params);
	if (!result.ok) return result;

	return ok(result.value.lovedtracks);
}
