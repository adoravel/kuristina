/**
 * kuristina, a bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// deno-lint-ignore-file jsx-curly-braces

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
	url,
	owner,
	repo,
}: {
	url: string;
	owner: string;
	repo: string;
}) {
	return (
		<h3>
			<icon name="git" />
			{`  `}
			<a href={url}>
				<strong>{owner}/</strong>
				{repo}
			</a>
		</h3>
	);
}

function RepoDescription({ description }: { description?: string }) {
	if (!description) return null;
	const desc = description.length > 80 ? `${name.slice(0, 79)}…` : description;
	return <p>{desc}</p>;
}

function FilePathRange(
	{ path, startLine, endLine }: { path: string; startLine?: number; endLine?: number },
) {
	const hasEndLine = endLine && endLine !== startLine;
	const range = startLine
		? `  line${hasEndLine ? "s" : ""} ${startLine}${hasEndLine ? ` until ${endLine}` : ""}`
		: "";
	return (
		<>
			<p>{"\u200b"}</p>
			<sub>
				<icon name="waypoints" />
				{`  `}
				<kbd>{path}</kbd>
				{range}
			</sub>
		</>
	);
}

function CodeSnippet({ snippet }: { snippet: Snippet }) {
	return <pre lang={snippet.language}>{snippet.text}</pre>;
}

function SnippetFooter({
	repoMeta,
	truncated,
	sourceLabel,
	icon,
}: {
	icon: RegisteredIconName;
	repoMeta?: ForgeRepoMeta;
	truncated: boolean;
	sourceLabel: string;
}) {
	return (
		<sub>
			<icon name={icon} />
			{`  ${sourceLabel}`}
			{repoMeta?.stars !== undefined && repoMeta.stars > 0 && (
				<>
					{`  ·  `}
					<icon name="star" />
					{`  `}
					{`${repoMeta.stars} star${repoMeta.stars > 1 ? "s" : ""}`}
				</>
			)}
			{repoMeta?.language && (
				<>
					{`  ·  `}
					<icon name="scrollText" />
					{`  `}
					{repoMeta.language}
				</>
			)}
			{truncated ? `  · truncated to ${MAX_LINES} lines` : ""}
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
				<RepoHeader url={url} owner={owner} repo={repo} />
				<RepoDescription description={repoMeta?.description} />
				<FilePathRange path={path} startLine={startLine} endLine={endLine} />
			</section>

			<CodeSnippet snippet={snippet} />

			<hr spacing={2} />
			<SnippetFooter
				icon={icon}
				repoMeta={repoMeta}
				truncated={!!snippet.truncated}
				sourceLabel={sourceLabel}
			/>
		</message>
	);
}
