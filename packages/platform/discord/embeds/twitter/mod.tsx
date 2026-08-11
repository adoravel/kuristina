/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { TweetInfo } from "@kuristina/services/social/twitter";

function truncateName(name: string): string {
	return name.length > 32 ? `${name.slice(0, 31)}…` : name;
}

function truncateText(text: string, max = 240): string {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
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

function QuotedBlock({ quoted, sensitive }: { quoted: TweetInfo; sensitive: boolean }) {
	return (
		<div>
			<section>
				<AuthorAvatar avatarUrl={quoted.authorAvatar} />
				<h3>
					<icon name="quote" />
					{`  `}
					<a href={quoted.url}>
						{truncateName(quoted.author)} (@{quoted.handle})
					</a>
				</h3>
				<TweetText
					text={truncateText(quoted.text)}
					sensitive={sensitive || quoted.possiblySensitive}
				/>
			</section>

			<MediaGallery
				media={quoted.mediaExtended}
				sensitive={sensitive || quoted.possiblySensitive}
			/>

			<TweetFooter
				likes={quoted.likes}
				retweets={quoted.retweets}
				replies={quoted.replies}
				dateEpoch={quoted.dateEpoch}
			/>
		</div>
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
	if (!text) return null;
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
	const stats = [
		{
			icon: "heart" as const,
			label: `like${likes > 1 ? "s" : ""}`,
			value: likes,
		},
		{
			icon: "repeat" as const,
			label: `retweet${retweets > 1 ? "s" : ""}`,
			value: retweets,
		},
		{
			icon: "comment" as const,
			label: `repl${replies > 1 ? "ies" : "y"}`,
			value: replies,
		},
	].filter((s) => s.value > 0);

	return (
		<>
			<hr />
			<sub>
				{stats.map((s, i) => (
					<>
						{i > 0 && "  ·  "}
						<icon name={s.icon} />
						{`  `}
						{s.value}
						{` `}
						{s.label}
					</>
				))}
				{stats.length > 0 && "  ·  "}
				{`<t:${Math.trunc(dateEpoch)}:F>`}
			</sub>
		</>
	);
}

export function renderTweet(tweet: TweetInfo) {
	console.log(JSON.stringify(
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
			{tweet.quoted && <QuotedBlock quoted={tweet.quoted} sensitive={tweet.possiblySensitive} />}
			<CommunityNoteBlock note={tweet.communityNote} />
		</message>,
		null,
		4,
	));
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
			{tweet.quoted && <QuotedBlock quoted={tweet.quoted} sensitive={tweet.possiblySensitive} />}
			<CommunityNoteBlock note={tweet.communityNote} />
		</message>
	);
}
