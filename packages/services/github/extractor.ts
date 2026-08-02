/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

const BLOB_URL_PATTERN =
	/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/blob\/([^/\s]+)\/([^\s#?]+)(?:#L(\d+)(?:-L?(\d+))?)?/g;

import type { GitHubBlobRef } from "./types.ts";

export function extractBlobRefs(content: string): GitHubBlobRef[] {
	return [...content.matchAll(BLOB_URL_PATTERN)].map(([, owner, repo, ref, path, start, end]) => ({
		owner,
		repo,
		ref,
		path: decodeURIComponent(path),
		startLine: start ? parseInt(start, 10) : undefined,
		endLine: end ? parseInt(end, 10) : start ? parseInt(start, 10) : undefined,
	}));
}
