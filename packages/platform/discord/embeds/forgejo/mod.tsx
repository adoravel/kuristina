/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { renderBlobSnippetCard } from "../code-forge/mod.tsx";
import type { ForgeRepoMeta, Snippet } from "@kuristina/services/forges/code-forge";
import type { ForgejoBlobRef } from "@kuristina/services/forges/forgejo";

export function renderSnippet(ref: ForgejoBlobRef, snippet: Snippet, repoMeta?: ForgeRepoMeta) {
	return renderBlobSnippetCard({
		icon: ref.instance === "codeberg.org" ? "codeberg" : "forgejo",
		sourceLabel: ref.instance,
		url:
			`https://${ref.instance}/${ref.owner}/${ref.repo}/src/${ref.refKind}/${ref.ref}/${ref.path}`,
		owner: ref.owner,
		repo: ref.repo,
		path: ref.path,
		startLine: ref.startLine,
		endLine: ref.endLine,
		snippet,
		repoMeta,
	});
}
