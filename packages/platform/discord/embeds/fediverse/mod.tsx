/**
 * kuristina, a bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { htmlToDiscordMarkdown } from "./markdown.tsx";
import type { FediPostInfo } from "@kuristina/services/social/fediverse";

function truncateAuthor(name: string): string {
	return name.length > 30 ? `${name.slice(0, 29)}…` : name;
}

function FediAvatar({ avatarUrl }: { avatarUrl?: string }) {
	if (!avatarUrl) return null;
	return (
		<accessory>
			<thumbnail url={avatarUrl} />
		</accessory>
	);
}

function FediHeader({ url, author, handle }: { url: string; author: string; handle: string }) {
	return (
		<h3>
			<icon name="mastodon" />
			<a href={url}>
				{`  `}
				{truncateAuthor(author)} (@{handle})
			</a>
		</h3>
	);
}

function FediContent({
	content,
	sensitive,
	spoilerText,
}: {
	content: string;
	sensitive: boolean;
	spoilerText?: string;
}) {
	return (
		<p>
			{sensitive && spoilerText && (
				<>
					<spoiler>
						<strong>⚠️ {htmlToDiscordMarkdown(spoilerText)}</strong>
					</spoiler>
					<br />
					<br />
				</>
			)}
			{htmlToDiscordMarkdown(content)}
		</p>
	);
}

function FediGallery({ media }: { media: FediPostInfo["mediaAttachments"] }) {
	if (!media || media.length === 0) return null;
	return (
		<gallery>
			{media.map((m) => <gallery-item url={m.url} description={m.description} />)}
		</gallery>
	);
}

function FediFooter({
	favourites,
	boosts,
	replies,
	createdAt,
	application,
}: {
	favourites: number;
	boosts: number;
	replies: number;
	createdAt: number;
	application?: string;
}) {
	return (
		<>
			<hr />
			<sub>
				<icon name="star" /> {favourites} favourites · <icon name="repeat" /> {boosts} boosts ·{" "}
				<icon name="comment" /> {replies} replies · {`<t:${Math.trunc(createdAt)}:F>`}
				{application && ` · via ${application}`}
			</sub>
		</>
	);
}

export function renderFediPost(post: FediPostInfo) {
	return (
		<message>
			<section>
				<FediAvatar avatarUrl={post.authorAvatar} />
				<FediHeader url={post.url} author={post.author} handle={post.handle} />
				<FediContent
					content={post.content}
					sensitive={!!post.sensitive}
					spoilerText={post.spoilerText}
				/>
			</section>
			<FediGallery media={post.mediaAttachments} />
			<FediFooter
				favourites={post.favouritesCount}
				boosts={post.reblogsCount}
				replies={post.repliesCount}
				createdAt={post.createdAtEpoch}
				application={post.application}
			/>
		</message>
	);
}
