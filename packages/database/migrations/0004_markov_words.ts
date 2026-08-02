/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "../schema.ts";

export async function up(db: SchemaContext): Promise<void> {
	await db.schema
		.createTable("markov_words")
		.ifNotExists()
		.addColumn("word", "text", (col) => col.primaryKey())
		.addColumn("count", "integer", (col) => col.notNull().defaultTo(1))
		.execute();

	await db.schema
		.createIndex("idx_markov_words_count")
		.ifNotExists()
		.on("markov_words")
		.column("count")
		.execute();
}

export async function down(db: SchemaContext): Promise<void> {
	await db.schema.dropIndex("idx_markov_words_count").ifExists().execute();
	await db.schema.dropTable("markov_words").ifExists().execute();
}
