/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { htmlToDiscordMarkdown } from "./markdown.tsx";
import type { FediPostInfo } from "./types.ts";

export function renderFediPost(post: FediPostInfo) {
	const hasMedia = post.mediaAttachments && post.mediaAttachments.length > 0;

	return (
		<message>
			<section>
				{post.authorAvatar && (
					<accessory>
						<thumbnail url={post.authorAvatar} />
					</accessory>
				)}
				<h3>
					<icon name="mastodon" />
					<a href={post.url}>
						{`  `}
						{post.author.length > 19 ? `${post.author.slice(0, 18)}…` : post.author}{" "}
						(@{post.handle}) ↗
					</a>
				</h3>
				<p>
					{post.sensitive && post.spoilerText && (
						<>
							<spoiler>
								<strong>⚠️ {htmlToDiscordMarkdown(post.spoilerText)}</strong>
							</spoiler>
							<br />
							<br />
						</>
					)}
					{htmlToDiscordMarkdown(post.content)}
				</p>
			</section>

			{hasMedia && (
				<gallery>
					{post.mediaAttachments.map((media) => (
						<gallery-item
							url={media.url}
							description={media.description}
						/>
					))}
				</gallery>
			)}

			<hr />
			<sub>
				<icon name="star" /> {post.favouritesCount} favourites · <icon name="repeat" />{" "}
				{post.reblogsCount} boosts · <icon name="comment" /> {post.repliesCount} replies ·{" "}
				{`<t:${Math.trunc(post.createdAtEpoch)}:F>`}
				{post.application && `· via ${post.application}`}
			</sub>
		</message>
	);
}
