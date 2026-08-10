/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { err, fetchWithRetry, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import { parseBskyUrl } from "./extractor.ts";
import type { BskyMedia, BskyPostInfo } from "./types.ts";

interface FxBskyMedia {
	type: "photo" | "video" | "gif";
	url?: string;
	width?: number;
	height?: number;
	altText?: string;
}

interface FxBskyAuthor {
	name: string;
	screen_name: string;
	avatar_url?: string;
}

interface FxBskyStatus {
	id: string;
	url: string;
	text: string;
	created_timestamp: number;
	likes: number;
	reposts: number;
	quotes: number;
	replies: number;
	author: FxBskyAuthor;
	media?: { all?: FxBskyMedia[] };
	possibly_sensitive?: boolean;
	provider: string;
	type: string;
}

interface FxBskyResponse {
	code: number;
	status: FxBskyStatus | null;
}

function mapMedia(media: FxBskyMedia[] = []): BskyMedia[] {
	return media
		.filter((m): m is FxBskyMedia & { url: string } => !!m.url)
		.map((m) => ({
			type: m.type === "photo" ? "image" : m.type,
			url: m.url,
			altText: m.altText,
			size: m.width && m.height ? { width: m.width, height: m.height } : undefined,
		}));
}

export async function fetchBskyPost(url: string): Promise<Result<BskyPostInfo, NetworkError>> {
	const parsed = parseBskyUrl(url);
	if (!parsed) return err(Errors.network("not a recognised Bluesky post URL"));

	const apiUrl = `https://api.fxbsky.app/2/status/${parsed.handle}/${parsed.rkey}`;
	const result = await fetchWithRetry<FxBskyResponse>(apiUrl, {
		retry: { maxAttempts: 2, baseDelayMs: 500 },
	});
	if (!result.ok) return result;

	const { status } = result.value;
	if (result.value.code !== 200 || !status || status.type !== "status") {
		return err(Errors.network(`fxbsky returned code ${result.value.code}, no usable status`));
	}

	return {
		ok: true,
		value: {
			author: status.author.name,
			handle: status.author.screen_name,
			authorAvatar: status.author.avatar_url,
			text: status.text,
			url: status.url || url,
			likes: status.likes ?? 0,
			reposts: status.reposts ?? 0,
			quotes: status.quotes ?? 0,
			replies: status.replies ?? 0,
			mediaExtended: mapMedia(status.media?.all),
			dateEpoch: Math.trunc(status.created_timestamp),
			postId: status.id,
			possiblySensitive: status.possibly_sensitive ?? false,
		},
	};
}
