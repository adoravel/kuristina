/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { err, fetchWithRetry, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import { parseStatusUrl } from "./extractor.ts";
import type { MediaExtended, TweetInfo } from "./types.ts";

interface VxTwitterResponse {
	date: string;
	date_epoch: number;
	hashtags: string[];
	likes?: number;
	mediaURLs?: string[];
	media_extended?: VxTwitterMediaExtended[];
	replies?: number;
	retweets?: number;
	text: string;
	tweetID?: string;
	tweetURL?: string;
	user_name: string;
	user_screen_name: string;
}

interface VxTwitterMediaExtended {
	altText?: string;
	duration_millis?: number;
	size?: {
		height: number;
		width: number;
	};
	thumbnail_url?: string;
	type: "image" | "video" | "gif";
	url: string;
}

function mapMediaExtended(media: VxTwitterMediaExtended[] = []): MediaExtended[] {
	return media.map((m) => ({
		altText: m.altText,
		durationMillis: m.duration_millis,
		size: m.size,
		thumbnail_url: m.thumbnail_url,
		type: m.type,
		url: m.url,
	}));
}

export async function fetchTweet(url: string): Promise<Result<TweetInfo, NetworkError>> {
	const parsed = parseStatusUrl(url);
	if (!parsed) {
		return err(Errors.network("not a recognised Twitter status URL"));
	}

	const apiUrl = `https://api.vxtwitter.com/${parsed.handle}/status/${parsed.id}`;
	const result = await fetchWithRetry<VxTwitterResponse>(apiUrl, {
		retry: { maxAttempts: 2, baseDelayMs: 500 },
	});

	if (!result.ok) return result;

	const value = result.value;

	return {
		ok: true,
		value: {
			author: value.user_name,
			handle: value.user_screen_name,
			text: value.text,
			url,
			likes: value.likes ?? 0,
			retweets: value.retweets ?? 0,
			replies: value.replies ?? 0,
			mediaURLs: value.mediaURLs ?? [],
			mediaExtended: mapMediaExtended(value.media_extended),
			hashtags: value.hashtags ?? [],
			date: value.date,
			dateEpoch: value.date_epoch,
			tweetID: value.tweetID ?? parsed.id,
			tweetURL: value.tweetURL ?? url,
		},
	};
}
