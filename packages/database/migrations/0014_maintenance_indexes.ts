/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema.createIndex("idx_music_link_cache_cached_at").ifNotExists()
		.on("music_link_cache").column("cached_at").execute();
	await ctx.schema.createIndex("idx_tidal_device_auth_created_at").ifNotExists()
		.on("tidal_device_auth").column("created_at").execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropIndex("idx_tidal_device_auth_created_at").ifExists().execute();
	await ctx.schema.dropIndex("idx_music_link_cache_cached_at").ifExists().execute();
}
