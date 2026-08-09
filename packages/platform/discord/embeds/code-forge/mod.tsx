/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { RegisteredIconName } from "@kuristina/discord-ui";
import { type ForgeRepoMeta, MAX_LINES, type Snippet } from "@kuristina/services/forges/code-forge";

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
	repoMeta?: ForgeRepoMeta;
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
	repoMeta,
}: BlobSnippetCardProps) {
	const range = startLine
		? ` L${startLine}${endLine && endLine !== startLine ? `-L${endLine}` : ""}`
		: "";

	return (
		<message>
			<section>
				{repoMeta?.avatarUrl && (
					<accessory>
						<thumbnail url={repoMeta.avatarUrl} description={`${owner}/${repo}`} />
					</accessory>
				)}
				<h3>
					<icon name={icon} />{" "}
					<a href={url}>
						<strong>{owner}/</strong>
						{repo}
					</a>
				</h3>
				{repoMeta?.description && <p>{repoMeta.description}</p>}
				<p>
					<kbd>{path}</kbd>
					{range}
				</p>
			</section>
			<pre lang={snippet.language}>{snippet.text}</pre>
			<hr spacing={2} />
			<sub>
				{repoMeta?.stars !== undefined && repoMeta?.stars > 0 && (
					<>
						<icon name="star" /> {repoMeta.stars.toLocaleString()} ·
					</>
				)}
				{repoMeta?.language && <>{repoMeta.language} ·</>}
				{snippet.truncated ? `truncated to ${MAX_LINES} lines · ` : ""}
				{sourceLabel}
			</sub>
		</message>
	);
}
