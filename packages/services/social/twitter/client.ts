/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { err, fetchWithRetry, flatMap, ok, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import { parseStatusUrl } from "./extractor.ts";
import type { MediaExtended, TweetInfo } from "./types.ts";
import { md } from "@kuristina/discord-ui";

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

interface FxTwitterUrlEntity {
	fromIndex: number;
	toIndex: number;
	ref: { type: string; url: string; urlType?: string };
}

interface FxTwitterCommunityNote {
	text: string;
	entities?: FxTwitterUrlEntity[];
}

interface FxTwitterTombstone {
	type: "tombstone";
	reason: string;
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
	quote?: FxTwitterTweet | FxTwitterTombstone | null;
	reposted_by?: unknown;
}

interface FxTwitterResponse {
	code: number;
	message: string;
	tweet?: FxTwitterTweet;
}

function isTombstone(value: unknown): value is FxTwitterTombstone {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		value.type === "tombstone"
	);
}

function mapMediaExtended(media: FxTwitterMedia[] = []): MediaExtended[] {
	return media
		.filter((m): m is FxTwitterMedia & { url: string } => Boolean(m.url))
		.map((m) => ({
			altText: m.altText,
			durationMillis: m.duration ? Math.round(m.duration * 1000) : undefined,
			size: m.width && m.height ? { width: m.width, height: m.height } : undefined,
			thumbnail_url: m.thumbnail_url,
			type: m.type === "gif" ? "gif" : m.type === "video" ? "video" : "image",
			url: m.url,
		}));
}

function expandCommunityNoteText(note?: FxTwitterCommunityNote | null): string | undefined {
	if (!note?.text) return undefined;
	if (!note.entities?.length) return note.text;

	let result = note.text;
	const sorted = [...note.entities].sort((a, b) => b.fromIndex - a.fromIndex);

	for (const entity of sorted) {
		if (entity.ref?.url) {
			const label = note.text.slice(entity.fromIndex, entity.toIndex);
			const url = entity.ref.url;
			const replacement = md.link(label, url);
			result = result.slice(0, entity.fromIndex) + replacement + result.slice(entity.toIndex);
		}
	}
	return result;
}

function mapTweet(tweet: FxTwitterTweet | FxTwitterTombstone): TweetInfo {
	if (isTombstone(tweet)) {
		return {
			author: "[deleted]",
			handle: "",
			text: `(original post ${tweet.reason})`,
			url: "",
			mediaURLs: [],
			mediaExtended: [],
			likes: 0,
			retweets: 0,
			replies: 0,
			date: "",
			dateEpoch: 0,
			tweetID: "",
			tweetURL: "",
			possiblySensitive: false,
			isRetweet: false,
		};
	}

	return {
		author: tweet.author.name,
		handle: tweet.author.screen_name,
		authorAvatar: tweet.author.avatar_url,
		text: tweet.text,
		url: tweet.url,
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
		communityNote: expandCommunityNoteText(tweet.community_note),
		quoted: tweet.quote ? mapTweet(tweet.quote) : undefined,
		isRetweet: !!tweet.reposted_by,
	};
}

function mapResponse(response: FxTwitterResponse): Result<TweetInfo, NetworkError> {
	if (response.code !== 200) {
		return err(
			Errors.network(
				`fxtwitter returned code ${response.code}: ${response.message}`,
			),
		);
	}

	if (!response.tweet) {
		return err(Errors.network("fxtwitter returned no tweet payload"));
	}

	return ok(mapTweet(response.tweet));
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

	return flatMap(result)(mapResponse);
}
