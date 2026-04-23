/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { tidal, TidalContext } from "~/services/tidal/client/mod.ts";
import { Album } from "~/services/tidal/client/album.ts";
import { Artist } from "~/services/tidal/client/artist.ts";

export interface Track {
	id: number;
	title: string;
	duration: number;
	trackNumber?: number;
	volumeNumber?: number;
	version?: string;
	isrc?: string;
	url?: string;
	explicit: boolean;
	popularity?: number;
	doublePopularity?: number;
	bpm?: number;
	key?: string;
	keyScale?: string;
	mediaMetadata?: { tags?: string[] };
	audioQuality?: string;
	audioModes?: string[];
	replayGain?: number;
	peak?: number;
	streamReady?: boolean;
	streamStartDate?: string;
	copyright?: string;
	artist?: Artist;
	artists: Artist[];
	album?: Album;
	editable?: boolean;
	allowStreaming?: boolean;
	adSupportedStreamReady?: boolean;
	djReady?: boolean;
	stemReady?: boolean;
	premiumStreamingOnly?: boolean;
	payToStream?: boolean;
	accessType?: string;
	spotlighted?: boolean;
	mixes?: { TRACK_MIX?: string };
}

export const fetchTidalTrack = (ctx: TidalContext, id: number) =>
	tidal<Track>(ctx, `/tracks/${id}`);

export const fetchTidalTracks = (ctx: TidalContext, ids: number[]) => {
	const $ = ids.join(",");
	return tidal<{ items: Track[] }>(ctx, `/tracks`, { ids: $ });
};
