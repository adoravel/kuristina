/**
 * kuristina, a bathroom sink discord bot
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

function RepoAvatar(
	{ avatarUrl, owner, repo }: { avatarUrl?: string; owner: string; repo: string },
) {
	if (!avatarUrl) return null;
	return (
		<accessory>
			<thumbnail url={avatarUrl} description={`${owner}/${repo}`} />
		</accessory>
	);
}

function RepoHeader({
	icon,
	url,
	owner,
	repo,
}: {
	icon: RegisteredIconName;
	url: string;
	owner: string;
	repo: string;
}) {
	return (
		<h3>
			<icon name={icon} />{" "}
			<a href={url}>
				<strong>{owner}/</strong>
				{repo}
			</a>
		</h3>
	);
}

function RepoDescription({ description }: { description?: string }) {
	if (!description) return null;
	return <p>{description}</p>;
}

function FilePathRange(
	{ path, startLine, endLine }: { path: string; startLine?: number; endLine?: number },
) {
	const range = startLine
		? ` L${startLine}${endLine && endLine !== startLine ? `-L${endLine}` : ""}`
		: "";
	return (
		<p>
			<kbd>{path}</kbd>
			{range}
		</p>
	);
}

function CodeSnippet({ snippet }: { snippet: Snippet }) {
	return <pre lang={snippet.language}>{snippet.text}</pre>;
}

function SnippetFooter({
	repoMeta,
	truncated,
	sourceLabel,
}: {
	repoMeta?: ForgeRepoMeta;
	truncated: boolean;
	sourceLabel: string;
}) {
	return (
		<sub>
			{repoMeta?.stars !== undefined && repoMeta.stars > 0 && (
				<>
					<icon name="star" /> {repoMeta.stars.toLocaleString()} ·
				</>
			)}
			{repoMeta?.language && <>{repoMeta.language} ·</>}
			{truncated ? `truncated to ${MAX_LINES} lines · ` : ""}
			{sourceLabel}
		</sub>
	);
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
	return (
		<message>
			<section>
				<RepoAvatar avatarUrl={repoMeta?.avatarUrl} owner={owner} repo={repo} />
				<RepoHeader icon={icon} url={url} owner={owner} repo={repo} />
				<RepoDescription description={repoMeta?.description} />
				<FilePathRange path={path} startLine={startLine} endLine={endLine} />
			</section>

			<CodeSnippet snippet={snippet} />

			<hr spacing={2} />
			<SnippetFooter
				repoMeta={repoMeta}
				truncated={!!snippet.truncated}
				sourceLabel={sourceLabel}
			/>
		</message>
	);
}
