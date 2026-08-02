/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

const STATUS_PATTERN = /https?:\/\/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/g;

export function extractStatusUrls(content: string): string[] {
	return [...content.matchAll(STATUS_PATTERN)].map((m) => m[0]);
}

export function parseStatusUrl(url: string): { handle: string; id: string } | undefined {
	const match = /https?:\/\/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/.exec(url);
	return match ? { handle: match[1], id: match[2] } : undefined;
}
