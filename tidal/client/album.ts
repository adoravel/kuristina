/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { tidal, TidalContext } from "~/tidal/client/mod.ts";
import { Artist } from "~/tidal/client/artist.ts";

export interface Album {
	id: number;
	title: string;
	artist?: Artist;
	artists?: Artist[];
	url?: string;
	explicit?: boolean;
	popularity?: number;
	audioQuality?: string;
	audioModes?: string[];
	copyright?: string;
	cover?: string;
	releaseDate?: string;
	streamStartDate?: string;
	numberOfTracks?: number;
	numberOfVolumes?: number;
	mediaMetadata?: { tags?: string[] };
	upc?: string;
	type?: string;
	version?: string;
	albumType?: string;
	videoCover?: string;
	vibrantColor?: string;
	streamReady?: boolean;
	allowStreaming?: boolean;
	payToStream?: boolean;
	upload?: boolean;
}

export const fetchTidalAlbum = (ctx: TidalContext, id: number) =>
	tidal<Album>(ctx, `/albums/${id}`);

export const fetchTidalAlbums = (ctx: TidalContext, ids: number[]) => {
	const $ = ids.join(",");
	return tidal<{ items: Album[] }>(ctx, `/albums`, { ids: $ });
};
