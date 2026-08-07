/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const MUSIC_PLATFORMS = [
	"spotify",
	"appleMusic",
	"youtube",
	"youtubeMusic",
	"tidal",
	"amazonMusic",
	"deezer",
	"soundcloud",
] as const;

export type MusicPlatform = typeof MUSIC_PLATFORMS[number];

export const PLATFORM_LABELS: Record<MusicPlatform, string> = {
	spotify: "Spotify",
	appleMusic: "Apple Music",
	youtube: "YouTube",
	youtubeMusic: "YouTube Music",
	tidal: "TIDAL",
	amazonMusic: "Amazon Music",
	deezer: "Deezer",
	soundcloud: "SoundCloud",
};

export interface MusicLinkResult {
	title: string;
	artist?: string;
	thumbnailUrl?: string;
	links: Partial<Record<MusicPlatform, string>>;
	source: "odesli" | "odesli+itunes";
}
