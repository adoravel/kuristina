/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { FxMedia, FxStatus, FxTombstone, FxTranslation } from "./types.ts";
import type { CamelCase } from "@kuristina/core";

export interface MappedMedia {
	altText?: string;
	durationMillis?: number;
	size?: { height: number; width: number };
	thumbnailUrl?: string;
	type: "image" | "video" | "gif";
	url: string;
}

export function mapFxMedia(media: FxMedia[] = []): MappedMedia[] {
	return media
		.filter((m): m is FxMedia & { url: string } => Boolean(m.url))
		.map((m) => ({
			altText: m.altText,
			durationMillis: m.duration ? Math.round(m.duration * 1000) : undefined,
			size: m.width && m.height ? { width: m.width, height: m.height } : undefined,
			thumbnailUrl: m.thumbnail_url,
			type: m.type === "gif" ? "gif" : m.type === "video" ? "video" : "image",
			url: m.url,
		}));
}

export function mapFxTranslation(
	translation?: FxStatus["translation"],
): CamelCase<FxTranslation> | undefined {
	if (!translation) return undefined;
	return {
		text: translation.text,
		sourceLang: translation.source_lang,
		targetLang: translation.target_lang,
		sourceLangEn: translation.source_lang_en,
		provider: translation.provider,
	};
}

export function mapFxTombstone(status: FxTombstone) {
	return {
		author: "[deleted]",
		handle: "",
		text: `(original post ${status.reason})`,
		url: "",
		mediaURLs: [] as string[],
		mediaExtended: [] as MappedMedia[],
		likes: 0,
		retweets: 0,
		reposts: 0,
		replies: 0,
		date: "",
		dateEpoch: 0,
		postId: "",
		tweetURL: "",
		possiblySensitive: false,
		isRetweet: false,
	};
}
