/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { BskyPostInfo } from "@kuristina/services/social/bluesky";

function truncateName(name: string): string {
	return name.length > 30 ? `${name.slice(0, 29)}…` : name;
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
	return <p>{sensitive ? <spoiler>{text}</spoiler> : text}</p>;
}

function MediaGallery(
	{ media, sensitive }: { media: BskyPostInfo["mediaExtended"]; sensitive: boolean },
) {
	if (!media.length) return null;
	return (
		<gallery>
			{media.map((m) => <gallery-item url={m.url} description={m.altText} spoiler={sensitive} />)}
		</gallery>
	);
}

function PostFooter({
	likes,
	reposts,
	quotes,
	replies,
	dateEpoch,
}: {
	likes: number;
	reposts: number;
	quotes: number;
	replies: number;
	dateEpoch: number;
}) {
	return (
		<>
			<hr />
			<sub>
				<icon name="heart" /> {likes} likes · <icon name="repeat" /> {reposts} reposts ·{" "}
				<icon name="repeat" /> {quotes} quotes · <icon name="comment" /> {replies} replies ·{" "}
				{`<t:${dateEpoch}:F>`}
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
				quotes={post.quotes}
				replies={post.replies}
				dateEpoch={post.dateEpoch}
			/>
		</message>
	);
}
