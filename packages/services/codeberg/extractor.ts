import type { CodebergBlobRef } from "./types.ts";

const BLOB_URL_PATTERN =
	/https:\/\/codeberg\.org\/([\w.-]+)\/([\w.-]+)\/src\/(branch|commit)\/([^/\s]+)\/([^\s#?]+)(?:#L(\d+)(?:-L?(\d+))?)?/g;

export function extractBlobRefs(content: string): CodebergBlobRef[] {
	return [...content.matchAll(BLOB_URL_PATTERN)].map((
		[, owner, repo, refKind, ref, path, start, end],
	) => ({
		owner,
		repo,
		refKind: refKind as "branch" | "commit",
		ref,
		path: decodeURIComponent(path),
		startLine: start ? parseInt(start, 10) : undefined,
		endLine: end ? parseInt(end, 10) : start ? parseInt(start, 10) : undefined,
	}));
}
