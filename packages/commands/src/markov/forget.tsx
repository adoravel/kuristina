/** :
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { greedyString } from "@kuristina/commands";
import { defineCommand, ownerOnly } from "@kuristina/commands/registry";
import { repositories } from "@kuristina/database";

export default defineCommand(["forget", "markov-forget"], {
	$: greedyString,
}, async (ctx) => {
	const pattern = ctx.remaining?.trim();
	if (!pattern || pattern.length < 3) {
		return void await ctx.error("give me a string at least 3 characters long to forget");
	}

	const result = await repositories.markov.forget(pattern);
	if (!result.ok) return void await ctx.error("failed to forget, try again");

	await ctx.success(`forgot ${result.value} entries containing "${pattern}"`);
}, {
	description:
		"Removes words and chain entries containing the given string from markov's memory. Owner only.",
	category: "owner",
	middleware: [ownerOnly],
	cooldownMs: 2000,
});
