/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { TweetInfo } from "./types.ts";

export function renderTweet(tweet: TweetInfo): string {
	return `**${tweet.author}** (@${tweet.handle})\n${tweet.text}\n-# ${tweet.likes} likes · ${tweet.retweets} retweets`;
}
