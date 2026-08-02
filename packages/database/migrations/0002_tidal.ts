/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("tidal_sessions")
		.ifNotExists()
		.addColumn("discord_id", "blob", (col) => col.primaryKey())
		.addColumn("access_token", "text", (col) => col.notNull())
		.addColumn("refresh_token", "text", (col) => col.notNull())
		.addColumn("expires_at", "integer", (col) => col.notNull())
		.addColumn("country_code", "text", (col) => col.notNull())
		.execute();

	await ctx.schema
		.createTable("tidal_device_auth")
		.ifNotExists()
		.addColumn("device_code", "text", (col) => col.primaryKey())
		.addColumn("user_id", "blob", (col) => col.notNull())
		.addColumn("created_at", "integer", (col) => col.notNull())
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropTable("tidal_device_auth").ifExists().execute();
	await ctx.schema.dropTable("tidal_sessions").ifExists().execute();
}
