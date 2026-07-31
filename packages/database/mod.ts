/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { Kysely } from "@kysely/kysely";

import { err, ok, type Result } from "@kuristina/core";
import { Errors } from "./errors.ts";
import { config } from "@kuristina/config";

import type { SqlError } from "./errors.ts";

import { dirname } from "@std/path";
import { DenoSqlite3Dialect } from "./adapter/dialect.ts";
import { Database, type KuristinaSchema } from "./schema.ts";
import { migrate } from "./migrations/mod.ts";

export let database: Kysely<KuristinaSchema>;

export async function initialiseDatabase(): Promise<Result<void, SqlError>> {
	Deno.mkdirSync(dirname(config.sqlite.path), { recursive: true });

	database = new Kysely({
		dialect: new DenoSqlite3Dialect({
			database: new Database(config.sqlite.path),
		}),
	});

	return await migrate(database);
}

export function closeDatabaseConnection() {
	database?.destroy();
}

export async function tryQuery<T>(fn: () => Promise<T>): Promise<Result<T, SqlError>> {
	try {
		return ok(await fn());
	} catch (e) {
		return err(Errors.queryFailed(fn.toString(), String(e)));
	}
}

export * from "./schema.ts";
export * from "./errors.ts";
export * from "./helpers.ts";
export * from "./repository/mod.ts";
