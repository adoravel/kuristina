/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ADMIN_EDITABLE_TABLES, type AdminEditableTable } from "./constants.ts";
import { getTableSchema } from "./schema.ts";
import type { ColumnInfo, TableSchema } from "./types.ts";

export const isEditableTable = (table: string): table is AdminEditableTable =>
	ADMIN_EDITABLE_TABLES.includes(table as AdminEditableTable);

export function assertEditableTable(table: string): asserts table is AdminEditableTable {
	if (!isEditableTable(table)) {
		throw new Error(`"${table}" isn't in the admin-editable allowlist`);
	}
}

export async function validateColumn(table: string, column: string): Promise<ColumnInfo> {
	const schema = await getTableSchema(table);
	const col = schema.columns.find((c) => c.name === column);
	if (!col) {
		throw new Error(`"${column}" doesn't exist in table "${table}"`);
	}
	return col;
}

export async function validateColumns(
	table: string,
	columns: readonly string[],
): Promise<ColumnInfo[]> {
	const schema = await getTableSchema(table);
	const errors: string[] = [];
	const results: ColumnInfo[] = [];

	for (const col of columns) {
		const found = schema.columns.find((c) => c.name === col);
		if (found) {
			results.push(found);
		} else {
			errors.push(`"${col}"`);
		}
	}

	if (errors.length) {
		throw new Error(`Unknown columns: ${errors.join(", ")}`);
	}
	return results;
}

export function assertPrimaryKeyComplete(
	schema: TableSchema,
	pk: Record<string, unknown>,
): void {
	const primaryKeys = schema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
	for (const key of primaryKeys) {
		if (!(key in pk) || pk[key] === null || pk[key] === undefined) {
			throw new Error(`Missing primary key column: "${key}"`);
		}
	}
}

export const validateAndGetSchema = async (table: string): Promise<TableSchema> => {
	assertEditableTable(table);
	return await getTableSchema(table);
};
