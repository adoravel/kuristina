/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { database } from "@kuristina/database";
import type { JsonValue } from "./types.ts";
import { MAX_PAGE_SIZE } from "./constants.ts";
import { assertEditableTable } from "./guard.ts";

export async function countRows(table: string): Promise<number> {
	assertEditableTable(table);
	const result = await database.selectFrom(table as never)
		.select(({ fn }) => fn.countAll<number>().as("count"))
		.executeTakeFirst();
	return Number(result?.count ?? 0);
}

export async function fetchRows(
	table: string,
	opts: { limit: number; offset: number },
): Promise<Record<string, JsonValue>[]> {
	assertEditableTable(table);
	const rows = await database.selectFrom(table as never)
		.selectAll()
		.limit(Math.min(opts.limit, MAX_PAGE_SIZE))
		.offset(Math.max(opts.offset, 0))
		.execute();
	return rows as Record<string, JsonValue>[];
}

export async function fetchRow(
	table: string,
	pk: Record<string, string | number>,
): Promise<Record<string, JsonValue> | null> {
	assertEditableTable(table);

	let query = database.selectFrom(table as never).selectAll();
	for (const [col, val] of Object.entries(pk)) {
		query = query.where(col as never, "=", val as never);
	}
	const row = await query.executeTakeFirst();
	return row ? (row as Record<string, JsonValue>) : null;
}

export async function fetchRowsWhere(
	table: string,
	conditions: Record<string, unknown>,
	opts?: { limit?: number; offset?: number },
): Promise<Record<string, JsonValue>[]> {
	assertEditableTable(table);
	let query = database.selectFrom(table as never).selectAll();
	for (const [col, val] of Object.entries(conditions)) {
		query = query.where(col as never, "=", val as never);
	}
	if (opts?.limit) query = query.limit(Math.min(opts.limit, MAX_PAGE_SIZE));
	if (opts?.offset) query = query.offset(Math.max(opts.offset, 0));
	const rows = await query.execute();
	return rows as Record<string, JsonValue>[];
}
