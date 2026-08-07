/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface GitHubBlobRef {
	owner: string;
	repo: string;
	ref: string;
	path: string;
	startLine?: number;
	endLine?: number;
}

export interface GitHubSnippet {
	language: string;
	text: string;
	truncated: boolean;
}
