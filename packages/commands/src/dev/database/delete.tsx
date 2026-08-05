/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand, ownerOnly } from "@kuristina/commands/core";
import { assertEditable, fetchRow, type MutationPlan } from "@kuristina/database/admin";
import { confirmAndApply, parseKeyValuePairs } from "./shared.tsx";

export default defineCommand({
	aliases: "delete",
	description: "Deletes a row. Shows a diff and asks for confirmation.",
	args: {
		table: arg.string({ description: "table name", required: true }),
		pk: arg.string({ description: "primary key, e.g. word=hello or id=42", required: true }),
	},
	async exec(ctx) {
		try {
			assertEditable(ctx.args.table);
		} catch (e) {
			return void await ctx.error((e as Error).message);
		}

		const pk = parseKeyValuePairs(ctx.args.pk);
		if (!Object.keys(pk).length) {
			return void await ctx.error("give me a primary key like `word=hello`");
		}

		const before = await fetchRow(ctx.args.table, pk);
		if (!before) {
			return void await ctx.error(`no row in \`${ctx.args.table}\` matching ${JSON.stringify(pk)}`);
		}

		const plan: MutationPlan = {
			id: crypto.randomUUID(),
			description: `delete ${ctx.args.table} ${ctx.args.pk}`,
			changes: [{ table: ctx.args.table, pk, before, after: null }],
		};

		await confirmAndApply(ctx, plan);
	},
	middleware: [ownerOnly],
});
