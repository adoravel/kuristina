/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand } from "@kuristina/commands/core";
import { ownerOnly } from "@kuristina/commands/core";
import { database } from "@kuristina/database";
import type { MutationPlan } from "@kuristina/database/admin";
import { confirmAndApply, MAX_PLAN_ROWS } from "../dev/database/shared.tsx";

export default defineCommand({
	aliases: ["forgor"],
	description: "Removes words and chain entries containing the given string from markov's memory.",
	category: "owner",
	cooldownMs: 2000,
	middleware: [ownerOnly],
	args: {
		pattern: arg.string({
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

		const like = `%${pattern}%`;
		const [chainRows, wordRows] = await Promise.all([
			database.selectFrom("markov_chain").selectAll()
				.where((eb) => eb.or([eb("prefix", "like", like), eb("suffix", "like", like)])).execute(),
			database.selectFrom("markov_words").selectAll().where("word", "like", like).execute(),
		]);

		const total = chainRows.length + wordRows.length;
		if (!total) {
			return void await ctx.reply({ content: `nothing in markov's memory matches "${pattern}"` });
		}
		if (total > MAX_PLAN_ROWS) {
			return void await ctx.error(
				`"${pattern}" matches ${total} rows, which is too many to preview/undo safely (cap: ${MAX_PLAN_ROWS}). narrow the pattern`,
			);
		}

		const plan: MutationPlan = {
			id: crypto.randomUUID(),
			description:
				`forget "${pattern}" (${chainRows.length} chain entries, ${wordRows.length} words)`,
			changes: [
				...chainRows.map((r) => ({
					table: "markov_chain",
					pk: { id: r.id },
					before: r as Record<string, unknown>,
					after: null,
				})),
				...wordRows.map((r) => ({
					table: "markov_words",
					pk: { word: r.word },
					before: r as Record<string, unknown>,
					after: null,
				})),
			],
		};

		await confirmAndApply(ctx, plan);
	},
});
