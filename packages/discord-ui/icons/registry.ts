/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type IconVariant = "default" | "success" | "danger" | "warn";

export type HttpUrl = `http://${string}` | `https://${string}`;

interface BaseIconRegistration {
	readonly name: string;
	readonly variant?: IconVariant;
}

export interface HeroiconRegistration extends BaseIconRegistration {
	readonly provider: "heroicons";
	readonly style?: "solid" | "outline";
}

export interface LucideIconRegistration extends BaseIconRegistration {
	readonly provider: "lucide";
	readonly strokeWidth?: number;
}

export interface SimpleIconRegistration extends BaseIconRegistration {
	readonly provider: "simpleicons";
}

export interface UrlIconRegistration extends BaseIconRegistration {
	readonly provider: HttpUrl;
	readonly style?: "solid" | "outline";
	readonly strokeWidth?: number;
}

export type IconRegistration =
	| LucideIconRegistration
	| HeroiconRegistration
	| SimpleIconRegistration
	| UrlIconRegistration;

export type IconProvider = IconRegistration["provider"];

export const registeredIcons = {
	music: { provider: "lucide", name: "music", strokeWidth: 2 },
	link: { provider: "lucide", name: "link" },
	check: { provider: "lucide", name: "check", variant: "success" },
	x: { provider: "heroicons", name: "x-mark", variant: "danger", style: "outline" },
	users: { provider: "heroicons", name: "users", style: "solid" },
	crown: { provider: "lucide", name: "crown", variant: "warn" },
	artist: { provider: "lucide", name: "mic-vocal", strokeWidth: 2 },
	help: { provider: "lucide", name: "circle-question-mark" },
	translate: { provider: "lucide", name: "languages" },
	clock: { provider: "lucide", name: "clock", strokeWidth: 2 },
	heart: { provider: "heroicons", name: "heart", variant: "danger", style: "solid" },
	spotify: { provider: "simpleicons", name: "spotify" },
	appleMusic: { provider: "simpleicons", name: "applemusic" },
	amazonMusic: {
		provider: "https://cdn.jsdelivr.net/npm/simple-icons@v11.0.0/icons",
		name: "amazonmusic",
	},
	youtubeMusic: { provider: "simpleicons", name: "youtubemusic" },
	youtube: { provider: "simpleicons", name: "youtube" },
	soundcloud: { provider: "simpleicons", name: "soundcloud" },
	tidal: { provider: "simpleicons", name: "tidal" },
	deezer: { provider: "simpleicons", name: "deezer" },
	disc: { provider: "lucide", name: "disc-3" },
	waveform: { provider: "lucide", name: "audio-waveform", strokeWidth: 2 },
	twitter: {
		provider: "https://cdn.jsdelivr.net/npm/simple-icons@v11.0.0/icons",
		name: "twitter",
	},
	mastodon: { provider: "simpleicons", name: "mastodon" },
	codeberg: { provider: "simpleicons", name: "codeberg" },
	github: { provider: "simpleicons", name: "github" },
	repeat: { provider: "lucide", name: "repeat-2", variant: "success" },
	comment: { provider: "lucide", name: "message-circle" },
	star: { provider: "lucide", name: "star", variant: "warn" },
} as const satisfies Record<string, IconRegistration>;

export type RegisteredIconName = keyof typeof registeredIcons;

export const VENDORED_ICONS_DIR = new URL("./vendored/", import.meta.url);
