/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { TweetInfo } from "@kuristina/services/twitter";

export function renderTweet(tweet: TweetInfo) {
	const hasMedia = tweet.mediaExtended && tweet.mediaExtended.length > 0;

	return (
		<message>
			<h3>
				<icon name="twitter" />
				<a href={tweet.url}>
					{`  `}
					{tweet.author.length > 19 ? `${tweet.author.slice(0, 18)}…` : tweet.author}{" "}
					(@{tweet.handle})
				</a>
			</h3>
			<p>{tweet.text}</p>
			{hasMedia && (
				<gallery>
					{tweet.mediaExtended.map((media) => (
						<gallery-item
							url={media.url}
							description={media.altText}
						/>
					))}
				</gallery>
			)}
			<hr />
			<sub>
				<icon name="heart" /> {tweet.likes} likes · <icon name="repeat" /> {tweet.retweets}{" "}
				retweets · <icon name="comment" /> {tweet.replies} replies ·{" "}
				{`<t:${Math.trunc(tweet.dateEpoch)}:F>`}
			</sub>
		</message>
	);
}
