/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { BskyInfo } from "@kuristina/services/social/fx";
import { type SocialPost, SocialPostLayout } from "../social/mod.tsx";

function mapBskyToSocial(post: BskyInfo): SocialPost {
	return {
		url: post.url,
		author: {
			name: post.author,
			handle: post.handle,
			avatarUrl: post.authorAvatar,
		},
		text: post.text,
		media: post.mediaExtended.map((m) => ({
			url: m.url,
			altText: m.altText,
			type: m.type,
		})),
		stats: {
			likes: post.likes,
			reposts: post.reposts,
			replies: post.replies,
			quotes: post.quotes,
		},
		dateEpoch: post.dateEpoch,
		sensitive: post.possiblySensitive,
	};
}

export function renderBskyPost(post: BskyInfo) {
	return <SocialPostLayout icon="bluesky" post={mapBskyToSocial(post)} repostLabel="reskeet" />;
}
