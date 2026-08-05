/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "../schema.ts";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("lastfm_response_cache")
		.ifNotExists()
		.addColumn("cache_key", "text", (col) => col.primaryKey())
		.addColumn("payload", "text", (col) => col.notNull())
		.addColumn("cached_at", "integer", (col) => col.notNull())
		.execute();

	await ctx.schema.createIndex("idx_lastfm_cache_cached_at").ifNotExists()
		.on("lastfm_response_cache").column("cached_at").execute();
}
