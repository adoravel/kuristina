/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { htmlToDiscordMarkdown } from "./markdown.tsx";
import type { FediPostInfo } from "@kuristina/services/social/fediverse";
import {
	SocialAuthorAvatar,
	SocialGallery,
	SocialHeader,
	type SocialPost,
	SocialStatsFooter,
} from "../social/mod.tsx";

function mapFediToSocial(post: FediPostInfo): SocialPost {
	return {
		url: post.url,
		author: {
			name: post.author,
			handle: post.handle,
			avatarUrl: post.authorAvatar,
		},
		text: htmlToDiscordMarkdown(post.content),
		media: post.mediaAttachments.map((m) => ({
			url: m.url,
			altText: m.description,
			type: m.type === "image" ? "image" : m.type === "video" ? "video" : undefined,
		})),
		stats: {
			likes: post.favouritesCount,
			reposts: post.reblogsCount,
			replies: post.repliesCount,
		},
		dateEpoch: post.createdAtEpoch,
		sensitive: post.sensitive,
	};
}

export function renderFediPost(post: FediPostInfo) {
	const social = mapFediToSocial(post);

	return (
		<message>
			<section>
				<SocialAuthorAvatar avatarUrl={social.author.avatarUrl} />
				<SocialHeader icon="mastodon" url={social.url} author={social.author} />

				{social.sensitive && post.spoilerText && (
					<>
						<spoiler>
							<strong>⚠️ {htmlToDiscordMarkdown(post.spoilerText)}</strong>
						</spoiler>
						<br />
						<br />
					</>
				)}

				<p>{social.text}</p>
			</section>

			<SocialGallery media={social.media} sensitive={social.sensitive} />

			<SocialStatsFooter stats={social.stats} dateEpoch={social.dateEpoch} />

			{post.application && (
				<sub>
					<icon name="link" />
					{`  via ${post.application}`}
				</sub>
			)}
		</message>
	);
}
