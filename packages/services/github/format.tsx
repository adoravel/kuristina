import { renderBlobSnippetCard } from "../code-forge/format.tsx";
import type { GitHubBlobRef, GitHubSnippet } from "./types.ts";

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
