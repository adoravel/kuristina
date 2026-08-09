/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { renderBlobSnippetCard } from "../code-forge/mod.tsx";
import type { Snippet } from "@kuristina/services/forges/code-forge";
import type { CodebergBlobRef } from "@kuristina/services/forges/codeberg";

export function renderSnippet(ref: CodebergBlobRef, snippet: Snippet) {
	return renderBlobSnippetCard({
		icon: "codeberg",
		sourceLabel: "codeberg.org",
		url: `https://codeberg.org/${ref.owner}/${ref.repo}/src/${ref.refKind}/${ref.ref}/${ref.path}`,
		owner: ref.owner,
		repo: ref.repo,
		path: ref.path,
		startLine: ref.startLine,
		endLine: ref.endLine,
		snippet,
	});
}
