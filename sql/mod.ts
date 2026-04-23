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
import { dirname, resolve } from "@std/path";
import { migrate } from "~/sql/migrate.ts";

interface SqlConfig {
	readonly path: string;
	readonly pragmas: readonly string[];
}

export const config: SqlConfig = {
	path: resolve(getConfig().sqlite.path),
	pragmas: [
		"journal_mode = WAL",
		"wal_autocheckpoint = 10000",
		"cache_size = -64000",
	],
};

export let database: Database;

export function initialiseDatabase(): Result<void, SqlError> {
	const dir = dirname(config.path);
	Deno.mkdirSync(dir, { recursive: true });

	database = new Database(config.path);
	try {
		database.exec(config.pragmas.map((p) => `PRAGMA ${p};`).join("\n"));
		return migrate();
	} catch (e) {
		return Fail(Errors.sql.queryFailed("initialiseDatabase()", String(e)));
	}
}

export function closeSqlConnection() {
	database?.close();
	database = null as any;
}

export type BindParams = RestBindParameters;
export type SqlValue = string | number | bigint | boolean | Date | Uint8Array | null;

export interface LimitOffset {
	readonly limit?: number;
	readonly offset?: number;
}

export type SortDirection = "ASC" | "DESC";

export interface SortOption {
	readonly column: string;
	readonly direction?: SortDirection;
}

export function paginated(sql: string, opts?: LimitOffset): string {
	if (!opts) return sql;
	let final = sql;
	if (opts.limit) final += ` LIMIT ${opts.limit}`;
	if (opts.offset) final += ` OFFSET ${opts.offset}`;
	return final;
}

export function orderBy(sql: string, sorts?: readonly SortOption[]): string {
	if (!sorts || sorts.length === 0) return sql;

	const clause = sorts
		.map((s) => `${s.column} ${s.direction ?? "ASC"}`)
		.join(", ");

	return `${sql} ORDER BY ${clause}`;
}

export function query(sql: string, opts?: LimitOffset & { sorts?: readonly SortOption[] }) {
	return paginated(orderBy(sql, opts?.sorts), opts);
}

export function prepare(sql: string) {
	try {
		return Ok(database.prepare(sql));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function searchV<T extends unknown[] = any[]>(
	sql: string,
	...params: BindParams
): Result<T[], SqlError> {
	try {
		return Ok(database.prepare(sql).values(params));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function distinct<T extends Array<unknown>>(
	sql: string,
	...params: BindParams
): Result<T | undefined, SqlError> {
	try {
		return Ok(database.prepare(sql).value(params));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function search<T extends object = Record<string, any>>(
	sql: string,
	...params: BindParams
): Result<T[], SqlError> {
	try {
		return Ok(database.prepare(sql).all(params));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function sql(
	sql: string,
	...params: BindParams
): Result<number, SqlError> {
	try {
		return Ok(params?.length ? database.prepare(sql).run(params) : database.exec(sql));
	} catch (e) {
		return Fail(Errors.sql.queryFailed(sql, String(e)));
	}
}

export function transaction<T>(fn: () => T): T {
	return database.transaction(fn)();
}
