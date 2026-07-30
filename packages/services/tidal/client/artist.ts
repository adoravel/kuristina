/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { tidal, type TidalContext } from "./http.ts";

export interface Artist {
	id: number;
	name: string;
	popularity?: number;
	url?: string;
	artistTypes?: ("ARTIST" | "CONTRIBUTOR")[];
	picture?: string;
	handle?: string;
	userId?: number;
	contributionLinkUrl?: string;
	artistRoles?: {
		category: string;
		categoryId: number;
	}[];
	mixes?: {
		ARTIST_MIX?: string;
	};
	selectedAlbumCoverFallback?: string;
	type?: "MAIN" | "FEATURED";
	version?: string;
}

export const fetchTidalArtist = (ctx: TidalContext, id: number) =>
	tidal<Artist>(ctx, `/artists/${id}`);

export const fetchTidalArtists = (ctx: TidalContext, ids: number[]) => {
	const $ = ids.join(",");
	return tidal<{ items: Artist[] }>(ctx, `/artists`, { ids: $ });
};
