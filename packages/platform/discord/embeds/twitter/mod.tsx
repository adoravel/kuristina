/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { TwitterInfo } from "@kuristina/services/social/fx";
import { type SocialPost, SocialPostLayout } from "../social/mod.tsx";

function mapTweetToSocial(tweet: TwitterInfo): SocialPost {
	return {
		url: tweet.url,
		author: {
			name: tweet.author,
			handle: tweet.handle,
			avatarUrl: tweet.authorAvatar,
		},
		text: tweet.text,
		media: tweet.mediaExtended.map((m) => ({
			url: m.url,
			altText: m.altText,
			type: m.type,
		})),
		stats: {
			likes: tweet.likes,
			reposts: tweet.retweets,
			replies: tweet.replies,
		},
		dateEpoch: tweet.dateEpoch,
		sensitive: tweet.possiblySensitive,
		quoted: tweet.quoted ? mapTweetToSocial(tweet.quoted) : undefined,
		communityNote: tweet.communityNote,
		translation: tweet.translation,
	};
}

export function renderTweet(tweet: TwitterInfo) {
	const post = mapTweetToSocial(tweet);
	return <SocialPostLayout icon="twitter" post={post} repostLabel="retweet" />;
}
