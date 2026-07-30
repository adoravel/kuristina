/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type SchemaContext, sql } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("users")
		.ifNotExists()
		.addColumn("user_id", "blob", (col) => col.primaryKey())
		.addColumn(
			"created_at",
			"integer",
			(col) => col.notNull().defaultTo(sql`(strftime('%s', 'now'))`),
		)
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropTable("users").ifExists().execute();
}
