/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type SchemaContext, sql } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("scrobble_accounts_new")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("discord_id", "blob", (col) => col.notNull())
		.addColumn("provider", "text")
		.addColumn("username", "text", (col) => col.notNull())
		.addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
		.addColumn("linked_at", "integer", (col) => col.notNull())
		.addUniqueConstraint("scrobble_accounts_discord_provider_unique", ["discord_id", "provider"])
		.execute();

	await sql`
		INSERT INTO scrobble_accounts_new (id, discord_id, provider, username, is_default, linked_at)
		SELECT 
			id, 
			discord_id, 
			CASE WHEN provider = 'lastfm' THEN 'last.fm' ELSE provider END, 
			username, 
			is_default, 
			linked_at
		FROM scrobble_accounts;
	`.execute(ctx);

	await ctx.schema.dropTable("scrobble_accounts").execute();

	await ctx.schema
		.alterTable("scrobble_accounts_new")
		.renameTo("scrobble_accounts")
		.execute();

	await ctx.schema
		.createIndex("idx_scrobble_accounts_discord_id")
		.on("scrobble_accounts")
		.column("discord_id")
		.execute();

	await ctx.schema
		.createIndex("idx_scrobble_accounts_provider")
		.on("scrobble_accounts")
		.column("provider")
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("scrobble_accounts_new")
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

	await sql`
		INSERT INTO scrobble_accounts_new (id, discord_id, provider, username, is_default, linked_at)
		SELECT 
			id, 
			discord_id, 
			CASE WHEN provider = 'last.fm' THEN 'lastfm' ELSE provider END, 
			username, 
			is_default, 
			linked_at
		FROM scrobble_accounts;
	`.execute(ctx);

	await ctx.schema.dropTable("scrobble_accounts").execute();

	await ctx.schema
		.alterTable("scrobble_accounts_new")
		.renameTo("scrobble_accounts")
		.execute();

	await ctx.schema
		.createIndex("idx_scrobble_accounts_discord_id")
		.on("scrobble_accounts")
		.column("discord_id")
		.execute();

	await ctx.schema
		.createIndex("idx_scrobble_accounts_provider")
		.on("scrobble_accounts")
		.column("provider")
		.execute();
}
