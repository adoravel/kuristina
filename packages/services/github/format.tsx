/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { GitHubBlobRef, GitHubSnippet } from "./types.ts";

export function renderSnippet(ref: GitHubBlobRef, snippet: GitHubSnippet): string {
	const range = ref.startLine
		? ` L${ref.startLine}${ref.endLine && ref.endLine !== ref.startLine ? `-L${ref.endLine}` : ""}`
		: "";
	const truncatedNote = snippet.truncated ? `\n-# truncated to 25 lines` : "";
	return `**${ref.owner}/${ref.repo}** \`${ref.path}\`${range}\n\`\`\`${snippet.language}\n${snippet.text}\n\`\`\`${truncatedNote}`;
}
