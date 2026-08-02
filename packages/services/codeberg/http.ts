/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Result } from "@kuristina/core";
import type { NetworkError } from "@kuristina/core";
import { fetchLineRangeSnippet, type Snippet } from "../code-forge/snippet.ts";
import type { CodebergBlobRef } from "./types.ts";

export async function fetchSnippet(
	ref: CodebergBlobRef,
): Promise<Result<Snippet, NetworkError>> {
	const url =
		`https://codeberg.org/${ref.owner}/${ref.repo}/raw/${ref.refKind}/${ref.ref}/${ref.path}`;
	return await fetchLineRangeSnippet(url, ref, "Codeberg");
}
