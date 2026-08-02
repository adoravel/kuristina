/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("markov_chain")
		.ifNotExists()
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("prefix", "text", (col) => col.notNull())
		.addColumn("suffix", "text", (col) => col.notNull())
		.addColumn("count", "integer", (col) => col.notNull().defaultTo(1))
		.addUniqueConstraint("markov_chain_prefix_suffix_unique", ["prefix", "suffix"])
		.execute();

	await ctx.schema
		.createIndex("idx_markov_prefix")
		.ifNotExists()
		.on("markov_chain")
		.column("prefix")
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.dropIndex("idx_markov_prefix").ifExists().execute();
	await ctx.schema.dropTable("markov_chain").ifExists().execute();
}
