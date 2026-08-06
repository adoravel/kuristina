/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand } from "@kuristina/commands/core";
import { ownerOnly } from "@kuristina/commands/core";
import { database } from "@kuristina/database";
import { createDeletePlan, type RowChange } from "@kuristina/database/admin";
import { confirmAndApply } from "../dev/database/shared.tsx";

const MAX_FORGET_ROWS = 65535;

export default defineCommand({
	aliases: ["forget", "forgor"],
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
			return void await ctx.error("gimme a string at least 3 characters long to forget");
		}

		const like = `%${pattern}%`;

		const [chainRows, wordRows] = await Promise.all([
			database.selectFrom("markov_chain")
				.select(["id", "prefix", "suffix", "count"])
				.where((eb) => eb.or([eb("prefix", "like", like), eb("suffix", "like", like)]))
				.execute(),
			database.selectFrom("markov_words")
				.select(["word", "count"])
				.where("word", "like", like)
				.execute(),
		]);

		const total = chainRows.length + wordRows.length;
		if (!total) {
			return void await ctx.reply({ content: `nothing in markov's memory matches "${pattern}"` });
		}

		if (total > MAX_FORGET_ROWS) {
			return void await ctx.error(
				`"${pattern}" matches ${total} rows, which is too many to preview/undo safely ` +
					`(cap: ${MAX_FORGET_ROWS}). narrow the pattern`,
			);
		}

		const changes = [
			...chainRows.map((r) => ({
				table: "markov_chain" as const,
				pk: { id: r.id },
				before: r as Record<string, unknown>,
				after: null,
			})),
			...wordRows.map((r) => ({
				table: "markov_words" as const,
				pk: { word: r.word },
				before: r as Record<string, unknown>,
				after: null,
			})),
		];

		const plan = createDeletePlan(
			"markov_chain",
			{},
			{},
			`forget "${pattern}" (${chainRows.length} chain entries, ${wordRows.length} words)`,
		);
		(plan as any).changes = changes;

		await confirmAndApply(ctx, plan.changes as RowChange[], plan.description);
	},
});
