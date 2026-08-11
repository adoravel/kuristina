/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { RegisteredIconName } from "@kuristina/discord-ui";

export interface SocialAuthor {
	name: string;
	handle: string;
	avatarUrl?: string;
}

export interface SocialMedia {
	url: string;
	altText?: string;
	type?: "image" | "video" | "gif";
}

export interface SocialStats {
	likes: number;
	reposts: number;
	replies: number;
	quotes?: number;
}

export interface SocialPost {
	url: string;
	author: SocialAuthor;
	text: string;
	media: SocialMedia[];
	stats: SocialStats;
	dateEpoch: number;
	sensitive: boolean;
	quoted?: SocialPost;
	communityNote?: string;
	translation?: {
		text: string;
		sourceLang: string;
		targetLang: string;
		sourceLangEn: string;
		provider: string;
	};
}

function truncateName(name: string): string {
	return name.length > 32 ? `${name.slice(0, 31)}…` : name;
}

export function SocialAuthorAvatar({ avatarUrl }: { avatarUrl?: string }) {
	if (!avatarUrl) return null;
	return (
		<accessory>
			<thumbnail url={avatarUrl} />
		</accessory>
	);
}

export function SocialHeader({
	icon,
	url,
	author,
}: {
	icon: RegisteredIconName;
	url: string;
	author: SocialAuthor;
}) {
	return (
		<h3>
			<icon name={icon} />
			{`  `}
			<a href={url}>
				{truncateName(author.name)} (@{author.handle})
			</a>
		</h3>
	);
}

export function SocialText({ text, sensitive }: { text: string; sensitive: boolean }) {
	if (!text) return null;
	return <p>{sensitive ? <spoiler>{text}</spoiler> : text}</p>;
}

export function SocialGallery({ media, sensitive }: { media: SocialMedia[]; sensitive: boolean }) {
	if (!media.length) return null;
	return (
		<gallery>
			{media.map((m) => <gallery-item url={m.url} description={m.altText} spoiler={sensitive} />)}
		</gallery>
	);
}

export function SocialStatsFooter({
	stats,
	dateEpoch,
	repostLabel = "repost",
}: {
	stats: SocialStats;
	dateEpoch: number;
	repostLabel?: string;
}) {
	const items = [
		stats.likes > 0 && {
			icon: "heart" as const,
			label: `like${stats.likes > 1 ? "s" : ""}`,
			value: stats.likes,
		},
		stats.reposts > 0 && {
			icon: "repeat" as const,
			label: `${repostLabel || "repost"}${stats.reposts > 1 ? "s" : ""}`,
			value: stats.reposts,
		},
		stats.quotes && stats.quotes > 0 && {
			icon: "quote" as const,
			label: `quote${stats.quotes > 1 ? "s" : ""}`,
			value: stats.quotes,
		},
		stats.replies > 0 && {
			icon: "comment" as const,
			label: `repl${stats.replies > 1 ? "ies" : "y"}`,
			value: stats.replies,
		},
	].filter((s): s is Exclude<typeof s, false | undefined | 0> => Boolean(s));

	return (
		<>
			<hr />
			<sub>
				{items.map((s, i) => (
					<>
						{i > 0 && "  ·  "}
						<icon name={s.icon} />
						{`  `}
						{s.value}
						{` `}
						{s.label}
					</>
				))}
				{items.length > 0 && "  ·  "}
				{`<t:${Math.trunc(dateEpoch)}:F>`}
			</sub>
		</>
	);
}

export function SocialTranslationNotice({
	translation,
}: {
	translation: SocialPost["translation"];
}) {
	if (!translation) return null;
	return (
		<sub>
			<icon name="translate" />
			{`  `}
			Translated from {translation.sourceLangEn} by {translation.provider}
		</sub>
	);
}

export function SocialCommunityNote({ note }: { note?: string }) {
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

export function SocialQuotedPost({
	icon,
	post,
	sensitive,
}: {
	icon: RegisteredIconName;
	post: SocialPost;
	sensitive: boolean;
}) {
	return (
		<div>
			<section>
				<SocialAuthorAvatar avatarUrl={post.author.avatarUrl} />
				<SocialHeader icon={icon} url={post.url} author={post.author} />
				<SocialText
					text={post.translation?.text || post.text}
					sensitive={sensitive || post.sensitive}
				/>
				<SocialTranslationNotice translation={post.translation} />
			</section>

			<SocialGallery media={post.media} sensitive={sensitive || post.sensitive} />

			<SocialStatsFooter stats={post.stats} dateEpoch={post.dateEpoch} />
		</div>
	);
}

export function SocialPostLayout({
	icon,
	post,
	repostLabel = "repost",
}: {
	icon: RegisteredIconName;
	post: SocialPost;
	repostLabel?: string;
}) {
	return (
		<message>
			<section>
				<SocialAuthorAvatar avatarUrl={post.author.avatarUrl} />
				<SocialHeader icon={icon} url={post.url} author={post.author} />
				<SocialText text={post.translation?.text || post.text} sensitive={post.sensitive} />
				<SocialTranslationNotice translation={post.translation} />
			</section>

			<SocialGallery media={post.media} sensitive={post.sensitive} />

			<SocialStatsFooter
				stats={post.stats}
				dateEpoch={post.dateEpoch}
				repostLabel={repostLabel}
			/>

			{post.quoted && (
				<SocialQuotedPost
					icon={icon}
					post={post.quoted}
					sensitive={post.sensitive}
				/>
			)}

			<SocialCommunityNote note={post.communityNote} />
		</message>
	);
}
