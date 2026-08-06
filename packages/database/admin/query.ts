/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { database } from "@kuristina/database";
import type { JsonValue, RowChange } from "./types.ts";
import { MAX_KEY_VALUE_PAIRS, MAX_PAGE_SIZE } from "./constants.ts";
import { assertEditableTable } from "./guard.ts";
import { resolvePrimaryKeyColumns } from "./pk.ts";

export async function countRows(table: string): Promise<number> {
	assertEditableTable(table);
	const row = await database.selectFrom(table as never)
		.select(({ fn }) => fn.countAll<number>().as("count"))
		.executeTakeFirst();
	return Number(row?.count ?? 0);
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
	filter: Record<string, string>,
): Promise<Record<string, unknown>[]> {
	assertEditableTable(table);
	let q = database.selectFrom(table as never).selectAll();
	for (const [col, val] of Object.entries(filter)) q = q.where(col as never, "=", val as never);
	return await q.executeTakeFirst() as Record<string, unknown>[];
}

export async function findMatchingRows(
	table: string,
	filter: Record<string, string>,
	limit: number = MAX_KEY_VALUE_PAIRS,
): Promise<Record<string, unknown>[]> {
	assertEditableTable(table);
	let q = database.selectFrom(table as never).selectAll();
	for (const [col, val] of Object.entries(filter)) q = q.where(col as never, "=", val as never);
	return await q.limit(Math.min(limit, MAX_PAGE_SIZE)).execute() as Record<string, unknown>[];
}

export async function buildDeleteChanges(
	table: string,
	rows: Record<string, unknown>[],
): Promise<RowChange[]> {
	const pkColumns = await resolvePrimaryKeyColumns(table);
	return rows.map((row) => ({
		table,
		pk: Object.fromEntries(pkColumns.map((col) => [col, row[col] as string | number])),
		before: row as any,
		after: null,
	}));
}

export async function buildSetChanges(
	table: string,
	rows: Record<string, unknown>[],
	changes: Record<string, unknown>,
): Promise<RowChange[]> {
	const pkColumns = await resolvePrimaryKeyColumns(table);
	return rows.map((row) => ({
		table,
		pk: Object.fromEntries(pkColumns.map((col) => [col, row[col] as string | number])),
		before: row as any,
		after: { ...row, ...changes } as any,
	}));
}
