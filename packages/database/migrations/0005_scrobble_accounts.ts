/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type SchemaContext, sql } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("scrobble_accounts")
		.ifNotExists()
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("discord_id", "blob", (col) => col.notNull())
		.addColumn(
			"provider",
			"text",
			(col) => col.notNull().check(sql`provider IN ('lastfm', 'listenbrainz')`),
		)
		.addColumn("username", "text", (col) => col.notNull())
		.addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
		.addColumn("linked_at", "integer", (col) => col.notNull())
		.addUniqueConstraint("scrobble_accounts_discord_provider_unique", ["discord_id", "provider"])
		.execute();

	await ctx.schema
		.createIndex("idx_scrobble_accounts_discord_id")
		.ifNotExists()
		.on("scrobble_accounts")
		.column("discord_id")
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropIndex("idx_scrobble_accounts_discord_id").ifExists().execute();
	await ctx.schema.dropTable("scrobble_accounts").ifExists().execute();
}
