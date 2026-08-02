/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

export interface FediPostInfo {
	author: string;
	handle: string;
	authorAvatar?: string;
	content: string;
	url: string;
	mediaAttachments: FediMediaAttachment[];
	repliesCount: number;
	reblogsCount: number;
	favouritesCount: number;
	createdAt: string;
	createdAtEpoch: number;
	postId: string;
	tags: string[];
	mentions: FediMention[];
	sensitive: boolean;
	spoilerText?: string;
	application?: string;
	card?: FediCard;
}

export interface FediMediaAttachment {
	id: string;
	type: "image" | "video" | "gifv" | "audio" | "unknown";
	url: string;
	previewUrl?: string;
	description?: string;
	width?: number;
	height?: number;
	blurhash?: string;
}

export interface FediMention {
	username: string;
	acct: string;
	url: string;
}

export interface FediCard {
	url: string;
	title: string;
	description?: string;
	image?: string;
	type?: string;
}
