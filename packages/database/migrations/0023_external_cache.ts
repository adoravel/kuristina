/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type SchemaContext, sql } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await sql`ALTER TABLE music_link_cache RENAME TO external_cache`.execute(ctx);
	await ctx.schema.alterTable("external_cache").renameColumn("source_url", "cache_key").execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.alterTable("external_cache").renameColumn("cache_key", "source_url").execute();
	await sql`ALTER TABLE external_cache RENAME TO music_link_cache`.execute(ctx);
}
