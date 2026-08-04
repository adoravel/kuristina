/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand } from "@kuristina/commands/core";
import { ownerOnly } from "@kuristina/commands/core";
import { repositories } from "@kuristina/database";
import { describe } from "@kuristina/errors";

export default defineCommand({
	aliases: ["markov-prune"],
	description:
		"Deletes low-count (default: count<=1) chain entries / one-off phrases that add noise.",
	middleware: [ownerOnly],
	args: {
		minCount: arg.integer({
			description: "prune entries with count <= this (default 1)",
			minValue: 0,
		}),
	},
	async exec(ctx) {
		const minCount = ctx.args.minCount ?? 1;
		const result = await repositories.markov.pruneNoise(minCount);
		if (!result.ok) return void await ctx.error(describe(result.error));
		await ctx.success(`pruned ${result.value} chain entries with count <= ${minCount}`);
	},
});
