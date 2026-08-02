import type { Result } from "@kuristina/core";
import type { NetworkError } from "@kuristina/core";
import { fetchLineRangeSnippet, type Snippet } from "../code-forge/snippet.ts";
import type { GitHubBlobRef, GitHubSnippet } from "./types.ts";

export async function fetchSnippet(
	ref: GitHubBlobRef,
): Promise<Result<GitHubSnippet, NetworkError>> {
	const url = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.ref}/${ref.path}`;
	return await fetchLineRangeSnippet(url, ref, "GitHub") as Result<Snippet, NetworkError>;
}
