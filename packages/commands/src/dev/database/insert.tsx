/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand, ownerOnly } from "@kuristina/commands/core";
import { assertEditableTable, validateAndGetSchema } from "@kuristina/database/admin";
import { confirmAndApply, parseKeyValues } from "./shared.tsx";

export default defineCommand({
	aliases: "insert",
	description: "Inserts a new row. Shows a diff and asks for confirmation.",
	args: {
		table: arg.string({ description: "table name", required: true }),
		values: arg.string({
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

		const values = parseKeyValues(ctx.args.values);
		const schema = await validateAndGetSchema(ctx.args.table);
		const columns = schema.columns.map((c) => c.name);

		const data: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(values)) {
			if (!columns.includes(k)) {
				return void await ctx.error(`"${k}" doesn't exist in table "${ctx.args.table}"`);
			}
			data[k] = v;
		}

		await confirmAndApply(
			ctx,
			[{ table: ctx.args.table, pk: {}, before: null, after: data as any }],
			`insert into ${ctx.args.table}`,
		);
	},
	middleware: [ownerOnly],
});
