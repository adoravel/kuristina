/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { database } from "@kuristina/database";
import { assertEditable } from "./candidates.ts";

export async function fetchRows(
	table: string,
	opts: { limit: number; offset: number },
): Promise<Record<string, unknown>[]> {
	assertEditable(table);
	return await database.selectFrom(table as never).selectAll()
		.limit(opts.limit).offset(opts.offset).execute() as Record<string, unknown>[];
}

export async function countRows(table: string): Promise<number> {
	assertEditable(table);
	const row = await database.selectFrom(table as never)
		.select(({ fn }) => fn.countAll().as("count")).executeTakeFirst();
	return Number((row as { count: unknown } | undefined)?.count ?? 0);
}

export async function fetchRow(
	table: string,
	pk: Record<string, string | number>,
): Promise<Record<string, unknown> | null> {
	assertEditable(table);
	let q = database.selectFrom(table as never).selectAll();
	for (const [col, val] of Object.entries(pk)) q = q.where(col as never, "=", val as never);
	const row = await q.executeTakeFirst();
	return (row as Record<string, unknown>) ?? null;
}
