/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { renderBlobSnippetCard } from "../code-forge/mod.tsx";
import type { GitHubBlobRef, GitHubSnippet } from "@kuristina/services/forges/github";

export function renderSnippet(ref: GitHubBlobRef, snippet: GitHubSnippet) {
	return renderBlobSnippetCard({
		icon: "github",
		sourceLabel: "github.com",
		url: `https://github.com/${ref.owner}/${ref.repo}/blob/${ref.ref}/${ref.path}`,
		owner: ref.owner,
		repo: ref.repo,
		path: ref.path,
		startLine: ref.startLine,
		endLine: ref.endLine,
		snippet,
	});
}
