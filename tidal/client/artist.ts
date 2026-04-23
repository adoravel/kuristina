/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { tidal, TidalContext } from "~/tidal/client/mod.ts";

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
