/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { err, fetchWithRetry, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import { parseFediUrl } from "./extractor.ts";
import type { FediCard, FediMediaAttachment, FediMention, FediPostInfo } from "./types.ts";

interface MastodonStatusResponse {
	id: string;
	created_at: string;
	content: string;
	url: string;
	uri: string;
	replies_count: number;
	reblogs_count: number;
	favourites_count: number;
	sensitive: boolean;
	spoiler_text?: string;
	account: {
		id: string;
		username: string;
		acct: string;
		display_name: string;
		avatar: string;
	};
	media_attachments: MastodonMediaAttachment[];
	mentions: MastodonMention[];
	tags: { name: string }[];
	application?: { name: string };
	card?: MastodonCard;
}

interface MastodonMediaAttachment {
	id: string;
	type: "image" | "video" | "gifv" | "audio" | "unknown";
	url: string;
	preview_url?: string;
	description?: string;
	meta?: {
		original?: {
			width?: number;
			height?: number;
		};
	};
	blurhash?: string;
}

interface MastodonMention {
	username: string;
	acct: string;
	url: string;
}

interface MastodonCard {
	url: string;
	title: string;
	description?: string;
	image?: string;
	type?: string;
}

function mapMediaAttachment(attachment: MastodonMediaAttachment): FediMediaAttachment {
	return {
		id: attachment.id,
		type: attachment.type,
		url: attachment.url,
		previewUrl: attachment.preview_url,
		description: attachment.description,
		width: attachment.meta?.original?.width,
		height: attachment.meta?.original?.height,
		blurhash: attachment.blurhash,
	};
}

function mapMention(mention: MastodonMention): FediMention {
	return {
		username: mention.username,
		acct: mention.acct,
		url: mention.url,
	};
}

function mapCard(card?: MastodonCard): FediCard | undefined {
	if (!card) return undefined;
	return {
		url: card.url,
		title: card.title,
		description: card.description,
		image: card.image,
		type: card.type,
	};
}

export async function fetchFediPost(url: string): Promise<Result<FediPostInfo, NetworkError>> {
	const parsed = parseFediUrl(url);
	if (!parsed) {
		return err(Errors.network("not a recognised Mastodon/Fediverse status URL"));
	}

	const apiUrl = `https://${parsed.instance}/api/v1/statuses/${parsed.id}`;
	const result = await fetchWithRetry<MastodonStatusResponse>(apiUrl, {
		headers: { Accept: "application/json" },
		retry: { maxAttempts: 2, baseDelayMs: 500 },
	});

	if (!result.ok) return result;

	const value = result.value;
	const account = value.account;

	return {
		ok: true,
		value: {
			author: account.display_name || account.username,
			handle: account.acct,
			authorAvatar: account.avatar,
			content: value.content,
			url: value.url || value.uri || url,
			mediaAttachments: value.media_attachments?.map(mapMediaAttachment) ?? [],
			repliesCount: value.replies_count ?? 0,
			reblogsCount: value.reblogs_count ?? 0,
			favouritesCount: value.favourites_count ?? 0,
			createdAt: value.created_at,
			createdAtEpoch: new Date(value.created_at).getTime() / 1000,
			postId: value.id,
			tags: value.tags?.map((t) => t.name) ?? [],
			mentions: value.mentions?.map(mapMention) ?? [],
			sensitive: value.sensitive ?? false,
			spoilerText: value.spoiler_text,
			application: value.application?.name,
			card: mapCard(value.card),
		},
	};
}
