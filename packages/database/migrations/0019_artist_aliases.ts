/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "../schema.ts";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("artist_alias_groups")
		.ifNotExists()
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("created_at", "integer", (col) => col.notNull())
		.execute();

	await ctx.schema
		.createTable("artist_aliases")
		.ifNotExists()
		.addColumn("name_key", "text", (col) => col.primaryKey())
		.addColumn("display_name", "text", (col) => col.notNull())
		.addColumn(
			"group_id",
			"integer",
			(col) => col.notNull().references("artist_alias_groups.id").onDelete("cascade"),
		)
		.addColumn("source", "text", (col) => col.notNull()) // 'autocorrect' | 'manual'
		.execute();

	await ctx.schema.createIndex("idx_artist_aliases_group").ifNotExists()
		.on("artist_aliases").column("group_id").execute();
}
