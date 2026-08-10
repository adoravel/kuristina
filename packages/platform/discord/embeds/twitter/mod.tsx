/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { QuotedTweet, TweetInfo } from "@kuristina/services/social/twitter";

function truncateName(name: string): string {
	return name.length > 30 ? `${name.slice(0, 29)}…` : name;
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

function AuthorAvatar({ avatarUrl }: { avatarUrl?: string }) {
	if (!avatarUrl) return null;
	return (
		<accessory>
			<thumbnail
				url={avatarUrl ||
					"https://upload.wikimedia.org/wikipedia/commons/0/03/Twitter_default_profile_400x400.png"}
			/>
		</accessory>
	);
}

function TweetHeader({ url, author, handle }: { url: string; author: string; handle: string }) {
	return (
		<h3>
			<icon name="twitter" />
			{`  `}
			<a href={url}>
				{truncateName(author)} (@{handle})
			</a>
		</h3>
	);
}

function TweetText({ text, sensitive }: { text: string; sensitive: boolean }) {
	return <p>{sensitive ? <spoiler>{text}</spoiler> : text}</p>;
}

function CommunityNoteBlock({ note }: { note?: string }) {
	if (!note) return null;
	return (
		<div>
			<h3>
				<icon name="help" />
				{` `}Community Note
			</h3>
			<p>{note}</p>
		</div>
	);
}

function TweetFooter({
	likes,
	retweets,
	replies,
	dateEpoch,
}: {
	likes: number;
	retweets: number;
	replies: number;
	dateEpoch: number;
}) {
	return (
		<>
			<hr />
			<sub>
				<icon name="heart" /> {likes} likes · <icon name="repeat" /> {retweets} retweets ·{" "}
				<icon name="comment" /> {replies} replies · {`<t:${Math.trunc(dateEpoch)}:F>`}
			</sub>
		</>
	);
}

export function renderTweet(tweet: TweetInfo) {
	return (
		<message root>
			<div>
				<section>
					<AuthorAvatar avatarUrl={tweet.authorAvatar} />
					<TweetHeader url={tweet.url} author={tweet.author} handle={tweet.handle} />
					<TweetText text={tweet.text} sensitive={tweet.possiblySensitive} />
				</section>

				<MediaGallery media={tweet.mediaExtended} sensitive={tweet.possiblySensitive} />

				<TweetFooter
					likes={tweet.likes}
					retweets={tweet.retweets}
					replies={tweet.replies}
					dateEpoch={tweet.dateEpoch}
				/>
			</div>
			{tweet.quoted &&
				(
					<div>
						<QuotedBlock quoted={tweet.quoted} sensitive={tweet.possiblySensitive} />
					</div>
				)}
			<CommunityNoteBlock note={tweet.communityNote} />
		</message>
	);
}
