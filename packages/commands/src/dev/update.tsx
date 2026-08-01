/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { defineCommand, ownerOnly } from "@kuristina/commands/registry";
import { requestRestart } from "@kuristina/discord-bot/restart";
import { git } from "@kuristina/discord-bot/git";

export default defineCommand(["update", "up"], {}, async (ctx) => {
	const fetched = await git.fetch();
	if (!fetched.ok) {
		return void await ctx.error(`\`git fetch\` failed:\n\`\`\`\n${fetched.stderr}\n\`\`\``);
	}

	const behind = await git.behindCount();
	if (behind === null) {
		return void await ctx.error(
			"couldn't determine how far behind upstream we are; is the tracking branch set up? <a:angie:1462638355018809590>",
		);
	}
	if (behind === 0) {
		return void await ctx.reply({ content: "already up to date ig <:snackstare:1508480379198111764>" });
	}

	if (await git.isDirty()) {
		return void await ctx.error(
			"working tree has uncommitted changes; refusing to pull to avoid clobbering them. clean it up first mate",
		);
	}

	const changedFiles = await git.pendingChangedFiles();

	const pulled = await git.pullFastForward();
	if (!pulled.ok) {
		return void await ctx.error(
			`\`git pull --ff-only\` failed (likely diverged history):\n\`\`\`\n${pulled.stderr}\n\`\`\``,
		);
	}

	const depsChanged = changedFiles.some((f) => f === "deno.json" || f === "deno.lock");
	if (depsChanged) {
		await ctx.reply({ content: "dependencies changed, re-caching before restart..." });
		const cache = new Deno.Command(Deno.execPath(), {
			args: ["install"],
			stdout: "piped",
			stderr: "piped",
		});
		const { code, stderr } = await cache.output();
		if (code !== 0) {
			return void await ctx.error(
				`\`deno install\` failed after pull, code is updated but deps aren't cached:\n\`\`\`\n${
					new TextDecoder().decode(stderr)
				}\n\`\`\``,
			);
		}
	}

	const sha = await git.currentSha();
	const reply = await ctx.success(
		`updated to \`${sha}\` (${behind} commit${behind > 1 ? "s" : ""} pulled), restarting...`,
	);

	await requestRestart(reply.channelId, reply.id);
}, {
	description: "Pulls the latest commits (fast-forward only, aborts on a dirty tree) and restarts.",
	category: "dev",
	middleware: [ownerOnly],
});
