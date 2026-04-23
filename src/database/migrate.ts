/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { resolve } from "@std/path";

import { SqlError } from "~/database/errors.ts";
import { distinct, query, sql, transaction } from "~/database/mod.ts";
import { Fail, Ok, Result } from "~/lib/result.ts";
import { Errors } from "~/lib/errors.ts";

const MIGRATIONS_TABLE = "schema_migrations";

export function migrate(
	directory: string = resolve("./sql/migrations/"),
): Result<void, SqlError> {
	const create = sql(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );
    `);
	if (!create) return create;

	const version = distinct<[number]>(
		query(`SELECT version FROM ${MIGRATIONS_TABLE}`, {
			limit: 1,
			sorts: [{ column: "version", direction: "DESC" }],
		}),
	);
	if (!version.ok) return version;

	const currentVersion = version.value?.[0] ?? 0;
	const nextVersion = currentVersion + 1;
	const path = `${directory}/${nextVersion.toString().padStart(4, "0")}.sql`;

	let content: string;
	try {
		content = Deno.readTextFileSync(path);
	} catch (e) {
		if (e instanceof Deno.errors.NotFound) {
			console.log(`database is up to date ^_^ (v. ${currentVersion})`);
			return Ok(undefined);
		}
		throw e;
	}

	console.log(` · applying migration '${nextVersion}'...`);

	try {
		transaction(() => {
			sql(content);
			sql(
				`INSERT INTO ${MIGRATIONS_TABLE} (version, applied_at) VALUES (?, ?)`,
				nextVersion,
				Date.now(),
			);
		});
		console.log(` ·  migration ${nextVersion} applied successfully :3`);
		return migrate(directory);
	} catch (err) {
		console.error(`  · migration ${nextVersion} failed qwq\n   `, err);
		return Fail(Errors.sql.queryFailed(content, String(err)));
	}
}
