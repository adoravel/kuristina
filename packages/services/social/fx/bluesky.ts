/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { err, map, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import {
	createFxClient,
	type FxStatus,
	isTombstone,
	mapFxMedia,
	mapFxTombstone,
	parseBskyUrl,
} from "./mod.ts";
import type { FxTombstone } from "./types.ts";

export interface BskyInfo {
	author: string;
	handle: string;
	authorAvatar?: string;
	text: string;
	url: string;
	likes: number;
	reposts: number;
	quotes: number;
	replies: number;
	mediaExtended: BskyMedia[];
	dateEpoch: number;
	postId: string;
	possiblySensitive: boolean;
}

export interface BskyMedia {
	type: "image" | "video" | "gif";
	url: string;
	altText?: string;
	size?: { width: number; height: number };
}

const client = createFxClient({
	baseUrl: "https://api.fxbsky.app",
	platform: "fxbsky",
});

function mapBskyStatus(status: FxStatus | FxTombstone, url: string): BskyInfo {
	if (isTombstone(status)) {
		return {
			...mapFxTombstone(status),
			quotes: 0,
			mediaExtended: [],
		};
	}

	const mappedMedia = mapFxMedia(status.media?.all);

	return {
		author: status.author.name,
		handle: status.author.screen_name,
		authorAvatar: status.author.avatar_url,
		text: status.text,
		url: status.url || url,
		likes: status.likes ?? 0,
		reposts: status.retweets ?? 0,
		quotes: 0,
		replies: status.replies ?? 0,
		mediaExtended: mappedMedia.map((m) => ({
			type: m.type === "image" ? "image" : m.type === "video" ? "video" : "gif",
			url: m.url,
			altText: m.altText,
			size: m.size,
		})),
		dateEpoch: status.created_timestamp,
		postId: status.id,
		possiblySensitive: status.possibly_sensitive ?? false,
	};
}

export async function fetchBsky(
	url: string,
): Promise<Result<BskyInfo, NetworkError>> {
	const parsed = parseBskyUrl(url);
	if (!parsed) {
		return err(Errors.network("not a recognised Bluesky post URL"));
	}

	const result = await client.fetchStatus(`${parsed.handle}/${parsed.rkey}`);
	return map(result)((status) => mapBskyStatus(status, url));
}
