/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type SchemaContext, sql } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await sql`
		CREATE VIRTUAL TABLE IF NOT EXISTS markov_chain_fts USING fts5(
			prefix, content='markov_chain', content_rowid='id'
		)
	`.execute(ctx);

	await sql`INSERT INTO markov_chain_fts(rowid, prefix) SELECT id, prefix FROM markov_chain`
		.execute(ctx);

	await sql`
		CREATE TRIGGER IF NOT EXISTS markov_chain_ai AFTER INSERT ON markov_chain BEGIN
			INSERT INTO markov_chain_fts(rowid, prefix) VALUES (new.id, new.prefix);
		END
	`.execute(ctx);

	await sql`
		CREATE TRIGGER IF NOT EXISTS markov_chain_ad AFTER DELETE ON markov_chain BEGIN
			INSERT INTO markov_chain_fts(markov_chain_fts, rowid, prefix) VALUES('delete', old.id, old.prefix);
		END
	`.execute(ctx);

	await sql`
		CREATE TRIGGER IF NOT EXISTS markov_chain_au AFTER UPDATE ON markov_chain BEGIN
			INSERT INTO markov_chain_fts(markov_chain_fts, rowid, prefix) VALUES('delete', old.id, old.prefix);
			INSERT INTO markov_chain_fts(rowid, prefix) VALUES (new.id, new.prefix);
		END
	`.execute(ctx);
}

export async function down(ctx: SchemaContext): Promise<void> {
	await sql`DROP TRIGGER IF EXISTS markov_chain_au`.execute(ctx);
	await sql`DROP TRIGGER IF EXISTS markov_chain_ad`.execute(ctx);
	await sql`DROP TRIGGER IF EXISTS markov_chain_ai`.execute(ctx);
	await sql`DROP TABLE IF EXISTS markov_chain_fts`.execute(ctx);
}
