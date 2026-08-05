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
	aliases: "adios",
	description:
		"Deletes low-count (default: count<=1) chain entries / one-off phrases that add noise.",
	category: "owner",
	cooldownMs: 5000,
	middleware: [ownerOnly],
	args: {
		minCount: arg.integer({
			description: "prune entries with count <= this (default 1)",
			minValue: 0,
		}),
	},
	async exec(ctx) {
		const minCount = ctx.args.minCount ?? 1;
		const rows = await database.selectFrom("markov_chain").selectAll().where(
			"count",
			"<=",
			minCount,
		).execute();

		if (!rows.length) {
			return void await ctx.reply({ content: `nothing to prune at count <= ${minCount}` });
		}
		if (rows.length > MAX_PLAN_ROWS) {
			return void await ctx.error(
				`count <= ${minCount} matches ${rows.length} rows, which is too many to preview/undo safely ` +
					`(cap: ${MAX_PLAN_ROWS}). raise the threshold's specificity or lower minCount to shrink the match set`,
			);
		}

		const plan: MutationPlan = {
			id: crypto.randomUUID(),
			description: `prune markov_chain entries with count <= ${minCount} (${rows.length} rows)`,
			changes: rows.map((r) => ({
				table: "markov_chain",
				pk: { id: r.id },
				before: r as Record<string, unknown>,
				after: null,
			})),
		};

		await confirmAndApply(ctx, plan);
	},
});
