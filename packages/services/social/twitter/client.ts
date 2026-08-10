/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { err, fetchWithRetry, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import { parseStatusUrl } from "./extractor.ts";
import type { MediaExtended, TweetInfo } from "./types.ts";

interface FxTwitterMedia {
	type: "photo" | "video" | "gif";
	id: string;
	url: string;
	width?: number;
	height?: number;
	duration?: number;
	thumbnail_url?: string;
	altText?: string;
}

interface FxTwitterAuthor {
	screen_name: string;
	name: string;
	avatar_url?: string;
}

interface FxTwitterCommunityNote {
	text: string;
}

interface FxTwitterTweet {
	url: string;
	id: string;
	text: string;
	author: FxTwitterAuthor;
	replies: number;
	retweets: number;
	likes: number;
	created_at: string;
	created_timestamp: number;
	possibly_sensitive?: boolean;
	community_note?: FxTwitterCommunityNote | null;
	media?: { all?: FxTwitterMedia[] };
	quote?: FxTwitterTweet | null;
	reposted_by?: unknown;
}

interface FxTwitterResponse {
	code: number;
	message: string;
	tweet?: FxTwitterTweet;
}

function mapMediaExtended(media: FxTwitterMedia[] = []): MediaExtended[] {
	return media.map((m) => ({
		altText: m.altText,
		durationMillis: m.duration ? Math.round(m.duration * 1000) : undefined,
		size: m.width && m.height ? { width: m.width, height: m.height } : undefined,
		thumbnail_url: m.thumbnail_url,
		type: m.type === "gif" ? "gif" : m.type === "video" ? "video" : "image",
		url: m.url,
	}));
}

function mapQuoted(quote?: FxTwitterTweet | null) {
	if (!quote) return undefined;
	return {
		author: quote.author.name,
		handle: quote.author.screen_name,
		text: quote.text,
		url: quote.url,
		mediaExtended: mapMediaExtended(quote.media?.all),
	};
}

export async function fetchTweet(url: string): Promise<Result<TweetInfo, NetworkError>> {
	const parsed = parseStatusUrl(url);
	if (!parsed) {
		return err(Errors.network("not a recognised Twitter status URL"));
	}

	const apiUrl = `https://api.fxtwitter.com/${parsed.handle}/status/${parsed.id}`;
	const result = await fetchWithRetry<FxTwitterResponse>(apiUrl, {
		retry: { maxAttempts: 2, baseDelayMs: 500 },
	});

	if (!result.ok) return result;

	const { tweet } = result.value;
	if (!tweet) {
		return err(
			Errors.network(
				`fxtwitter returned no tweet payload (code ${result.value.code}: ${result.value.message})`,
			),
		);
	}

	return {
		ok: true,
		value: {
			author: tweet.author.name,
			handle: tweet.author.screen_name,
			authorAvatar: tweet.author.avatar_url,
			text: tweet.text,
			url,
			likes: tweet.likes ?? 0,
			retweets: tweet.retweets ?? 0,
			replies: tweet.replies ?? 0,
			mediaURLs: (tweet.media?.all ?? []).map((m) => m.url),
			mediaExtended: mapMediaExtended(tweet.media?.all),
			date: tweet.created_at,
			dateEpoch: tweet.created_timestamp,
			tweetID: tweet.id,
			tweetURL: tweet.url,
			possiblySensitive: tweet.possibly_sensitive ?? false,
			communityNote: tweet.community_note?.text || undefined,
			quoted: mapQuoted(tweet.quote),
			isRetweet: !!tweet.reposted_by,
		},
	};
}
