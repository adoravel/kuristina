/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { QuotedTweet, TweetInfo, TweetPoll } from "@kuristina/services/social/twitter";

function truncateName(name: string): string {
	return name.length > 24 ? `${name.slice(0, 23)}…` : name;
}

function MediaGallery(
	{ media, sensitive }: { media: TweetInfo["mediaExtended"]; sensitive: boolean },
) {
	if (!media.length) return null;
	return (
		<gallery>
			{media.map((m) => <gallery-item url={m.url} description={m.altText} spoiler={sensitive} />)}
		</gallery>
	);
}

function PollBlock({ poll }: { poll: TweetPoll }) {
	return (
		<blockquote>
			{poll.choices.map((c) => `${c.label} — ${c.percentage}%`).join("\n")}
			<br />
			<sub>{poll.totalVotes.toLocaleString()} votes</sub>
		</blockquote>
	);
}

function QuotedBlock({ quoted, sensitive }: { quoted: QuotedTweet; sensitive: boolean }) {
	return (
		<blockquote>
			<strong>{truncateName(quoted.author)}</strong> (@{quoted.handle})
			<br />
			{quoted.text}
			<MediaGallery media={quoted.mediaExtended} sensitive={sensitive} />
		</blockquote>
	);
}

export function renderTweet(tweet: TweetInfo) {
	return (
		<message>
			<section>
				{tweet.authorAvatar && (
					<accessory>
						<thumbnail
							url={tweet.authorAvatar ||
								"https://upload.wikimedia.org/wikipedia/commons/0/03/Twitter_default_profile_400x400.png"}
						/>
					</accessory>
				)}
				<h3>
					<icon name="twitter" />
					<a href={tweet.url}>
						{`  `}
						{truncateName(tweet.author)} (@{tweet.handle})
					</a>
				</h3>
				<p>
					{tweet.possiblySensitive ? <spoiler>{tweet.text}</spoiler> : tweet.text}
				</p>
			</section>

			<MediaGallery media={tweet.mediaExtended} sensitive={tweet.possiblySensitive} />

			{tweet.poll && <PollBlock poll={tweet.poll} />}
			{tweet.quoted && <QuotedBlock quoted={tweet.quoted} sensitive={tweet.possiblySensitive} />}

			{tweet.communityNote && (
				<p>
					<sub>
						<icon name="help" /> <strong>Community Note:</strong> {tweet.communityNote}
					</sub>
				</p>
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
