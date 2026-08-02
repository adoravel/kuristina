/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

const FEDI_PATTERN = /https?:\/\/([\w.-]+)\/@([\w.-]+)\/(\d+)/g;

export function extractFediUrls(content: string): string[] {
	return [...content.matchAll(FEDI_PATTERN)].map((m) => m[0]);
}
