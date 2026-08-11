/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface FxMedia {
	type: "photo" | "video" | "gif";
	id: string;
	url: string;
	width?: number;
	height?: number;
	duration?: number;
	thumbnail_url?: string;
	altText?: string;
}

export interface FxAuthor {
	screen_name: string;
	name: string;
	avatar_url?: string;
}

export interface FxUrlEntity {
	fromIndex: number;
	toIndex: number;
	ref: { type: string; url: string; urlType?: string };
}

export interface FxCommunityNote {
	text: string;
	entities?: FxUrlEntity[];
}

export interface FxTombstone {
	type: "tombstone";
	reason: string;
}

export interface FxTranslation {
	text: string;
	source_lang: string;
	target_lang: string;
	source_lang_en: string;
	provider: string;
}

export interface FxStatus {
	url: string;
	id: string;
	text: string;
	author: FxAuthor;
	replies: number;
	retweets: number;
	likes: number;
	created_at: string;
	created_timestamp: number;
	possibly_sensitive?: boolean;
	community_note?: FxCommunityNote | null;
	media?: { all?: FxMedia[] };
	quote?: FxStatus | FxTombstone | null;
	reposted_by?: unknown;
	lang?: string;
	translation?: FxTranslation;
}

export interface FxResponse {
	code: number;
	message: string;
	tweet?: FxStatus;
	status?: FxStatus;
}
