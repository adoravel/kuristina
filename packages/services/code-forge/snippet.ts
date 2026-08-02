import { tryAsync, withRetry } from "@kuristina/core";
import { err, ok, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import { config } from "@kuristina/config";

const MAX_LINES = 25;

const LANG_MAP: Record<string, string> = {
	ts: "typescript",
	tsx: "tsx",
	js: "javascript",
	jsx: "jsx",
	py: "python",
	rs: "rust",
	go: "go",
	java: "java",
	c: "c",
	cpp: "cpp",
	cs: "csharp",
	rb: "ruby",
	php: "php",
	sh: "bash",
	json: "json",
	yml: "yaml",
	yaml: "yaml",
	md: "markdown",
	html: "html",
	css: "css",
	sql: "sql",
	toml: "toml",
};

export function languageFor(path: string): string {
	return LANG_MAP[path.split(".").pop()?.toLowerCase() ?? ""] ?? "";
}

export interface BlobLineRange {
	readonly path: string;
	readonly startLine?: number;
	readonly endLine?: number;
}

export interface Snippet {
	language: string;
	text: string;
	truncated: boolean;
}

export async function fetchLineRangeSnippet(
	rawUrl: string,
	ref: BlobLineRange,
	sourceTag: string,
): Promise<Result<Snippet, NetworkError>> {
	const response = await tryAsync(() =>
		withRetry(
			() =>
				fetch(rawUrl, {
					headers: { "User-Agent": config.network.userAgent },
					signal: AbortSignal.timeout(8000),
				}),
			{ retryIf: (_, attempt) => attempt < 2 },
		)
	);
	if (!response.ok) return response;
	if (!response.value.ok) {
		return err(
			Errors.network(`${sourceTag} raw fetch failed for ${ref.path}`, response.value.status),
		);
	}

	const body = await tryAsync(() => response.value.text());
	if (!body.ok) return body;

	const lines = body.value.split("\n");
	const start = Math.max(1, ref.startLine ?? 1);
	const requestedEnd = ref.endLine ?? Math.min(lines.length, start + MAX_LINES - 1);
	const end = Math.min(requestedEnd, lines.length, start + MAX_LINES - 1);
	// const width = String(end).length;

	const text = lines.slice(start - 1, end)
		// .map((line, i) => `${String(start + i).padStart(width, " ")} | ${line}`)
		.join("\n");

	return ok({ language: languageFor(ref.path), text, truncated: requestedEnd > end });
}
