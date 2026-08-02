/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("icon_emojis")
		.ifNotExists()
		.addColumn("name", "text", (col) => col.primaryKey())
		.addColumn("emoji_id", "text", (col) => col.notNull())
		.addColumn("animated", "integer", (col) => col.notNull().defaultTo(0))
		.addColumn("source_hash", "text", (col) => col.notNull())
		.addColumn("uploaded_at", "integer", (col) => col.notNull())
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropTable("icon_emojis").ifExists().execute();
}
