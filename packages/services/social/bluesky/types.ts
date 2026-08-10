/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface BskyPostInfo {
	author: string;
	handle: string;
	authorAvatar?: string;
	text: string;
	url: string;
	likes: number;
	reposts: number;
	quotes: number;
	replies: number;
	mediaExtended: BskyMedia[];
	dateEpoch: number;
	postId: string;
	possiblySensitive: boolean;
}

export interface BskyMedia {
	type: "image" | "video" | "gif";
	url: string;
	altText?: string;
	size?: { width: number; height: number };
}
