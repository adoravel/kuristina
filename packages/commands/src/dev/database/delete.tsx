/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand, ownerOnly, string } from "@kuristina/commands/core";
import { assertEditableTable, fetchRowsWhere } from "@kuristina/database/admin";
import { confirmAndApply, parseKeyValues } from "./shared.tsx";

export default defineCommand({
	aliases: "delete",
	description: "Deletes a row. Shows a diff and asks for confirmation.",
	args: {
		table: string({ description: "table name", required: true }),
		pk: string({
			description: "primary key, e.g. word=hello or id=42",
			required: true,
			greedy: true,
		}),
	},
	async exec(ctx) {
		try {
			assertEditableTable(ctx.args.table);
			const pk = parseKeyValues(ctx.args.pk);

			const rows = await fetchRowsWhere(ctx.args.table, pk, { limit: 1 });
			if (!rows || !rows.length) {
				return void await ctx.error(
					`no row in \`${ctx.args.table}\` matching ${JSON.stringify(pk)}`,
				);
			}

			const before = rows[0];
			await confirmAndApply(
				ctx,
				[{ table: ctx.args.table, pk, before, after: null }],
				`delete ${ctx.args.table} ${ctx.args.pk}`,
			);
		} catch (e: any) {
			await ctx.error("message" in e ? e.message : String(e));
		}
	},
	middleware: [ownerOnly],
});
