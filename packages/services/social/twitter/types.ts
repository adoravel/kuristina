/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface TweetInfo {
	author: string;
	handle: string;
	authorAvatar?: string;
	text: string;
	url: string;
	likes: number;
	retweets: number;
	replies: number;
	mediaURLs: string[];
	mediaExtended: MediaExtended[];
	date: string;
	dateEpoch: number;
	tweetID: string;
	tweetURL: string;
	possiblySensitive: boolean;
	communityNote?: string;
	quoted?: QuotedTweet;
	isRetweet: boolean;
}

export interface MediaExtended {
	altText?: string;
	durationMillis?: number;
	size?: {
		height: number;
		width: number;
	};
	thumbnail_url?: string;
	type: "image" | "video" | "gif";
	url: string;
}

export interface QuotedTweet {
	author: string;
	handle: string;
	text: string;
	url: string;
	mediaExtended: MediaExtended[];
}
