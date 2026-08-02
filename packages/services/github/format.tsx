/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { GitHubBlobRef, GitHubSnippet } from "./types.ts";

export function renderSnippet(ref: GitHubBlobRef, snippet: GitHubSnippet) {
	const range = ref.startLine
		? ` L${ref.startLine}${ref.endLine && ref.endLine !== ref.startLine ? `-L${ref.endLine}` : ""}`
		: "";
	return (
		<message>
			<h3>
				<icon name="github" /> <strong>{ref.owner}/</strong>
				{ref.repo}
			</h3>
			<p>
				<kbd>{ref.path}</kbd>
				{range}
			</p>
			<pre lang={snippet.language}>{snippet.text}</pre>
			{snippet.truncated && <sub>truncated to 25 lines</sub>}
		</message>
	);
}
