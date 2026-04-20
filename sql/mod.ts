/*n
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Database, RestBindParameters } from "@db/sqlite";
import { Fail, Ok, type Result } from "~/lib/result.ts";
import { getConfig } from "~/config/mod.ts";
import { SqlError } from "~/sql/errors.ts";
import { Errors } from "~/lib/errors.ts";

let db: Database | null = null;

export function getDatabasePath(): string {
	return getConfig().sqlite.path;
}

export function getDb(): Database {
	if (!db) {
		db = new Database(getDatabasePath());
		db.exec("PRAGMA journal_mode = WAL;");
		initializeSchema(db);
	}
	return db;
}

function initializeSchema(database: Database) {
	database.exec(`
        CREATE TABLE IF NOT EXISTS users (
            discord_id INTEGER PRIMARY KEY,
            lastfm_username TEXT,
            tidal_token TEXT,
            tidal_refresh_token TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);
}

export function query<T = unknown>(
	sql: string,
	...params: RestBindParameters
): Result<T[], SqlError> {
	try {
		const database = getDb();
		return Ok(database.prepare(sql).all(params) as T[]);
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function run(
	sql: string,
	...params: RestBindParameters
): Result<number, SqlError> {
	try {
		const database = getDb();
		return Ok(database.prepare(sql).run(params));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function close() {
	db?.close();
	db = null;
}
