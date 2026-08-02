/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("music_link_cache")
		.ifNotExists()
		.addColumn("source_url", "text", (col) => col.primaryKey())
		.addColumn("payload", "text", (col) => col.notNull())
		.addColumn("cached_at", "integer", (col) => col.notNull())
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropTable("music_link_cache").ifExists().execute();
}
