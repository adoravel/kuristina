/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type SchemaContext, sql } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("guild_members")
		.ifNotExists()
		.addColumn("discord_id", "blob", (col) => col.notNull())
		.addColumn("guild_id", "blob", (col) => col.notNull())
		.addColumn("joined_at", "integer", (col) => col.notNull())
		.addPrimaryKeyConstraint("guild_members_pk", ["discord_id", "guild_id"])
		.modifyEnd(sql`without rowid`)
		.execute();

	await ctx.schema
		.createIndex("idx_scrobble_accounts_provider")
		.ifNotExists()
		.on("scrobble_accounts")
		.column("provider")
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropIndex("idx_scrobble_accounts_provider").ifExists().execute();
	await ctx.schema.dropTable("guild_members").ifExists().execute();
}
