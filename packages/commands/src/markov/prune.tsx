/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { optional } from "@kuristina/commands";
import { number } from "@kuristina/commands";
import { defineCommand, ownerOnly } from "@kuristina/commands/registry";
import { repositories } from "@kuristina/database";

export default defineCommand(["markov-prune"], {
	$: optional(number),
}, async (ctx) => {
	const minCount = ctx.remaining ?? 1;
	const result = await repositories.markov.pruneNoise(minCount);
	if (!result.ok) return void await ctx.error("prune failed, check logs");
	await ctx.success(`pruned ${result.value} chain entries with count <= ${minCount}`);
}, {
	description:
		"Deletes low-count (default: count<=1) chain entries / one-off phrases that add noise.",
	category: "owner",
	middleware: [ownerOnly],
	cooldownMs: 5000,
});
