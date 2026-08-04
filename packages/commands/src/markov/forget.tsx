/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand, string } from "@kuristina/commands/core";
import { ownerOnly } from "@kuristina/commands/core";
import { repositories } from "@kuristina/database";
import { describe } from "@kuristina/errors";

export default defineCommand({
	aliases: ["forget", "markov-forget"],
	description: "Removes words and chain entries containing the given string from markov's memory.",
	middleware: [ownerOnly],
	args: {
		pattern: string({
			description: "substring to forget (min 3 characters)",
			required: true,
			minLength: 3,
			greedy: true,
		}),
	},
	async exec(ctx) {
		const pattern = ctx.args.pattern.trim();
		if (pattern.length < 3) {
			return void await ctx.error("give me a string at least 3 characters long to forget");
		}

		const result = await repositories.markov.forget(pattern);
		if (!result.ok) return void await ctx.error(describe(result.error));

		await ctx.success(`forgot ${result.value} entries containing "${pattern}"`);
	},
});
