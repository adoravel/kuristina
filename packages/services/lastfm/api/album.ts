/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { LastFmImage } from "../types.ts";
import type { LastFmTrack } from "./track.ts";

export interface LastFmAlbum {
	name: string;
	mbid?: string;
	url: string;
	artist: string;
	image?: LastFmImage[];
	tracks?: { track: LastFmTrack[] };
	tags?: { tag: { name: string; url: string }[] };
	wiki?: { summary?: string; content?: string };
}
