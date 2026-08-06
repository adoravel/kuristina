/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { string, defineCommand, ownerOnly } from "@kuristina/commands/core";
import { assertEditableTable, fetchRow, validateAndGetSchema } from "@kuristina/database/admin";
import { confirmAndApply, evaluateValues, parseKeyValues } from "./shared.tsx";

export default defineCommand({
	aliases: "set",
	description: "Updates specific columns on a row. Shows a diff and asks for confirmation.",
	args: {
		table: string({ description: "table name", required: true }),
		pk: string({ description: "primary key, e.g. word=hello or id=42", required: true }),
		changes: string({
			description: "column=value pairs, comma-separated",
			required: true,
			greedy: true,
		}),
	},
	async exec(ctx) {
		try {
			assertEditableTable(ctx.args.table);
		} catch (e) {
			return void await ctx.error((e as Error).message);
		}

		const pk = parseKeyValues(ctx.args.pk);

		const rawChanges = parseKeyValues(ctx.args.changes);
		const changes = evaluateValues(rawChanges);

		const before = await fetchRow(ctx.args.table, pk);
		if (!before) {
			return void await ctx.error(`no row in \`${ctx.args.table}\` matching ${JSON.stringify(pk)}`);
		}

		const schema = await validateAndGetSchema(ctx.args.table);
		const after = { ...before };

		for (const [k, v] of Object.entries(changes)) {
			const col = schema.columns.find((c) => c.name === k);
			if (!col) {
				return void await ctx.error(`"${k}" doesn't exist in table "${ctx.args.table}"`);
			}
			if (col.isPrimaryKey) {
				return void await ctx.error(`Cannot update primary key column "${k}"`);
			}
			after[k] = v;
		}

		await confirmAndApply(
			ctx,
			[{ table: ctx.args.table, pk, before, after }],
			`set ${ctx.args.table} ${ctx.args.pk}`,
		);
	},
	middleware: [ownerOnly],
});
