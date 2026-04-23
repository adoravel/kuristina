/*
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Database, RestBindParameters } from "@db/sqlite";
import { Fail, Ok, type Result } from "~/lib/result.ts";
import { getConfig } from "~/config/mod.ts";
import { SqlError } from "~/sql/errors.ts";
import { Errors } from "~/lib/errors.ts";
import { importTidalSchema } from "~/tidal/schema.ts";

let db: Database | null = null;

export function getDatabasePath(): string {
	return getConfig().sqlite.path;
}

export function getDatabase(): Database {
	if (!db) {
		const path = getDatabasePath();

		const dir = path.substring(0, path.lastIndexOf("/"));
		Deno.mkdirSync(dir, { recursive: true });

		db = new Database(path);
		db.exec("PRAGMA journal_mode = WAL;");
	}
	return db;
}

export function initialiseSchema() {
	sql(`
        CREATE TABLE IF NOT EXISTS users (
            user_id BLOB PRIMARY KEY,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);
	importTidalSchema();
}

export function query<T extends unknown[] = any[]>(
	sql: string,
	...params: RestBindParameters
): Result<T[], SqlError> {
	try {
		return Ok(getDatabase().prepare(sql).values(params));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function distinct<T extends Array<unknown>>(
	sql: string,
	...params: RestBindParameters
): Result<T | undefined, SqlError> {
	try {
		return Ok(getDatabase().prepare(sql).value(params));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function search<T extends object = Record<string, any>>(
	sql: string,
	...params: RestBindParameters
): Result<T[], SqlError> {
	try {
		return Ok(getDatabase().prepare(sql).all(params));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function sql(
	sql: string,
	...params: RestBindParameters
): Result<number, SqlError> {
	try {
		return Ok(getDatabase().prepare(sql).run(params));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function close() {
	db?.close();
	db = null;
}
