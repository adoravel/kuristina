/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { sql } from "@kysely/kysely";
import { database } from "@kuristina/database";
import { assertEditableTable } from "./guard.ts";

const cache = new Map<string, string[]>();

export async function resolvePrimaryKeyColumns(table: string): Promise<string[]> {
	assertEditableTable(table);

	const cached = cache.get(table);
	if (cached) return cached;

	const { rows } = await sql<{ name: string; pk: number }>`PRAGMA table_info(${sql.raw(table)})`
		.execute(database);

	const columns = rows.filter((r) => r.pk > 0).sort((a, b) => a.pk - b.pk).map((r) => r.name);
	if (!columns.length) {
		throw new Error(`"${table}" has no declared primary key`);
	}

	cache.set(table, columns);
	return columns;
}
