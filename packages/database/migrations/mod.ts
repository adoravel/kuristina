/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { Kysely } from "@kysely/kysely";
import { FileMigrationProvider, Migrator } from "@kysely/kysely/migration";
import { join, toFileUrl } from "@std/path";
import { err, ok, type Result } from "@kuristina/core";
import { Errors, type SqlError } from "../errors.ts";
import type { KuristinaSchema, SchemaContext } from "../schema.ts";

function migrator(db: Kysely<KuristinaSchema>): Migrator {
	return new Migrator({
		db,
		provider: new FileMigrationProvider({
			fs: {
				readdir: async (p) => {
					const entries = await Array.fromAsync(Deno.readDir(p));
					return entries
						.filter((e) => e.isFile)
						.map((e) => e.name);
				},
			},
			path: {
				join: (path: string, ...paths: string[]) => toFileUrl(join(path, ...paths)).href,
			},
			migrationFolder: import.meta.dirname!,
		}),
	});
}

function report(results: readonly { migrationName: string; status: string }[] | undefined) {
	for (const r of results ?? []) {
		if (r.status === "Success") {
			logger.yay(` ·  migration ${r.migrationName} applied :3`);
		} else {
			logger.boo(` · migration ${r.migrationName} failed qwq`);
		}
	}
}

export async function migrate(ctx: SchemaContext): Promise<Result<void, SqlError>> {
	const { error, results } = await migrator(ctx).migrateToLatest();
	report(results);
	if (error) return err(Errors.queryFailed("migrate()", String(error)));
	return ok(undefined);
}

/** steps the database back by one migration. intended for local development only */
export async function rollback(ctx: SchemaContext): Promise<Result<void, SqlError>> {
	const { error, results } = await migrator(ctx).migrateDown();
	report(results);
	if (error) return err(Errors.queryFailed("rollback()", String(error)));
	return ok(undefined);
}
