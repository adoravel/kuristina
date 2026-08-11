/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { BskyPostInfo } from "@kuristina/services/social/bluesky";

function truncateName(name: string): string {
	return name.length > 32 ? `${name.slice(0, 31)}…` : name;
}

function AuthorAvatar({ avatarUrl }: { avatarUrl?: string }) {
	if (!avatarUrl) return null;
	return (
		<accessory>
			<thumbnail url={avatarUrl} />
		</accessory>
	);
}

function PostHeader({ url, author, handle }: { url: string; author: string; handle: string }) {
	return (
		<h3>
			<icon name="bluesky" />
			{`  `}
			<a href={url}>
				{truncateName(author)} (@{handle})
			</a>
		</h3>
	);
}

function PostText({ text, sensitive }: { text: string; sensitive: boolean }) {
	if (!text) return null;
	return <p>{sensitive ? <spoiler>{text}</spoiler> : text}</p>;
}

function MediaGallery(
	{ media, sensitive }: { media: BskyPostInfo["mediaExtended"]; sensitive: boolean },
) {
	if (!media.length) return null;
	return (
		<gallery>
			{media.map((m) => (
				<gallery-item url={m.url} description={m.altText || undefined} spoiler={sensitive} />
			))}
		</gallery>
	);
}

function PostFooter({
	likes,
	reposts,
	replies,
	dateEpoch,
}: {
	likes: number;
	reposts: number;
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
			label: `reskeet${reposts > 1 ? "s" : ""}`,
			value: reposts,
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

export function renderBskyPost(post: BskyPostInfo) {
	return (
		<message>
			<section>
				<AuthorAvatar avatarUrl={post.authorAvatar} />
				<PostHeader url={post.url} author={post.author} handle={post.handle} />
				<PostText text={post.text} sensitive={post.possiblySensitive} />
			</section>

			<MediaGallery media={post.mediaExtended} sensitive={post.possiblySensitive} />

			<PostFooter
				likes={post.likes}
				reposts={post.reposts}
				replies={post.replies}
				dateEpoch={post.dateEpoch}
			/>
		</message>
	);
}
