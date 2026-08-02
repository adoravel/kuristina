/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

export interface TweetInfo {
	author: string;
	handle: string;
	text: string;
	url: string;
	likes: number;
	retweets: number;
	mediaUrls: string[];
}
