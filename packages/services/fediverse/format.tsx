/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { FediPostInfo } from "./types.ts";

export function renderFediPost(post: FediPostInfo): string {
	return `**${post.author}**\n${post.content}`;
}
