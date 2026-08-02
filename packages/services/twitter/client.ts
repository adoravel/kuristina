/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { err, fetchWithRetry, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import { parseStatusUrl } from "./extractor.ts";
import type { TweetInfo } from "./types.ts";

interface VxTwitterResponse {
	user_name: string;
	user_screen_name: string;
	text: string;
	likes?: number;
	retweets?: number;
	mediaURLs?: string[];
}

export async function fetchTweet(url: string): Promise<Result<TweetInfo, NetworkError>> {
	const parsed = parseStatusUrl(url);
	if (!parsed) return err(Errors.network("not a recognised Twitter status URL"));

	const apiUrl = `https://api.vxtwitter.com/${parsed.handle}/status/${parsed.id}`;
	const result = await fetchWithRetry<VxTwitterResponse>(apiUrl, {
		retry: { maxAttempts: 2, baseDelayMs: 500 },
	});
	if (!result.ok) return result;

	return {
		ok: true,
		value: {
			author: result.value.user_name,
			handle: result.value.user_screen_name,
			text: result.value.text,
			url,
			likes: result.value.likes ?? 0,
			retweets: result.value.retweets ?? 0,
			mediaUrls: result.value.mediaURLs ?? [],
		},
	};
}
