/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { RegisteredIconName } from "@kuristina/discord-ui";
import type { Snippet } from "@kuristina/services/forges/code-forge";

export interface BlobSnippetCardProps {
	icon: RegisteredIconName;
	sourceLabel: string;
	url: string;
	owner: string;
	repo: string;
	path: string;
	startLine?: number;
	endLine?: number;
	snippet: Snippet;
}

export function renderBlobSnippetCard({
	icon,
	sourceLabel,
	url,
	owner,
	repo,
	path,
	startLine,
	endLine,
	snippet,
}: BlobSnippetCardProps) {
	const range = startLine
		? ` L${startLine}${endLine && endLine !== startLine ? `-L${endLine}` : ""}`
		: "";

	return (
		<message>
			<h3>
				<icon name={icon} />{" "}
				<a href={url}>
					<strong>{owner}/</strong>
					{repo}
				</a>
			</h3>
			<p>
				<kbd>{path}</kbd>
				{range}
			</p>
			<pre lang={snippet.language}>{snippet.text}</pre>
			<hr spacing={2} />
			<sub>
				{snippet.truncated ? "truncated to 25 lines · " : ""}
				{sourceLabel}
			</sub>
		</message>
	);
}
