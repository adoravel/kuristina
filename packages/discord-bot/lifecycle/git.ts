/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

interface GitResult {
	ok: boolean;
	stdout: string;
	stderr: string;
}

async function run(...args: string[]): Promise<GitResult> {
	const command = new Deno.Command("git", { args, stdout: "piped", stderr: "piped" });
	const { code, stdout, stderr } = await command.output();
	return {
		ok: code === 0,
		stdout: new TextDecoder().decode(stdout).trim(),
		stderr: new TextDecoder().decode(stderr).trim(),
	};
}

export const git = {
	fetch: () => run("fetch", "--quiet"),

	async isDirty(): Promise<boolean> {
		const result = await run("status", "--porcelain");
		return result.stdout.length > 0;
	},

	/** commits behind upstream, or null if the upstream branch isn't configured / comparable */
	async behindCount(): Promise<number | null> {
		const result = await run("rev-list", "HEAD..@{u}", "--count");
		if (!result.ok) return null;
		const n = parseInt(result.stdout, 10);
		return Number.isNaN(n) ? null : n;
	},

	/** files that would change if we pulled right now, call before `pullFastForward()` */
	async pendingChangedFiles(): Promise<string[]> {
		const result = await run("diff", "--name-only", "HEAD", "@{u}");
		return result.ok ? result.stdout.split("\n").filter(Boolean) : [];
	},

	pullFastForward: () => run("pull", "--ff-only", "--quiet"),

	async currentSha(): Promise<string> {
		const result = await run("rev-parse", "--short", "HEAD");
		return result.ok ? result.stdout : "unknown";
	},
};
