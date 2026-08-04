/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("guild_profile_syncs")
		.ifNotExists()
		.addColumn("guild_id", "text", (col) => col.primaryKey())
		.addColumn("params_hash", "text", (col) => col.notNull())
		.addColumn("synced_at", "integer", (col) => col.notNull())
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropTable("guild_profile_syncs").ifExists().execute();
}
