/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("message_companions")
		.ifNotExists()
		.addColumn("source_message_id", "text", (col) => col.notNull())
		.addColumn("response_message_id", "text", (col) => col.notNull())
		.addColumn("channel_id", "text", (col) => col.notNull())
		.addColumn("kind", "text", (col) => col.notNull()) // 'command' | 'richlink'
		.addColumn("created_at", "integer", (col) => col.notNull())
		.addPrimaryKeyConstraint("message_companions_pk", ["source_message_id", "response_message_id"])
		.execute();

	await ctx.schema.createIndex("idx_message_companions_source").ifNotExists()
		.on("message_companions").column("source_message_id").execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropIndex("idx_message_companions_source").ifExists().execute();
	await ctx.schema.dropTable("message_companions").ifExists().execute();
}
