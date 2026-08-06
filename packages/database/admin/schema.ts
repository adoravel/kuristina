/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { database } from "@kuristina/database";
import { sql } from "@kysely/kysely";
import type { ColumnInfo, TableSchema } from "./types.ts";

const SCHEMA_CACHE = new Map<string, TableSchema>();

function parseColumnType(sqliteType: string): string {
	const upper = sqliteType.toUpperCase();
	if (upper.includes("INT")) return "integer";
	if (upper.includes("CHAR") || upper.includes("TEXT") || upper.includes("CLOB")) return "text";
	if (upper.includes("BLOB")) return "blob";
	if (upper.includes("REAL") || upper.includes("FLOA") || upper.includes("DOUB")) return "real";
	if (upper.includes("BOOLEAN")) return "boolean";
	return upper;
}

function parseDefaultValue(raw: unknown): ColumnInfo["defaultValue"] {
	if (raw === null || raw === undefined) return null;
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (trimmed === "NULL") return null;

		if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
		if (/^-?\d+\.\d+$/.test(trimmed)) return Number(trimmed);

		if (trimmed === "true") return true;
		if (trimmed === "false") return false;

		const quoted = trimmed.match(/^['"](.*)['"]$/);
		return quoted ? quoted[1] : trimmed;
	}
	return raw as ColumnInfo["defaultValue"];
}

export async function getTableSchema(table: string): Promise<TableSchema> {
	const cached = SCHEMA_CACHE.get(table);
	if (cached) return cached;

	const result = await sql<{
		name: string;
		type: string;
		notnull: number;
		dflt_value: unknown;
		pk: number;
	}>`PRAGMA table_info(${sql.raw(table)})`.execute(database);

	const columns: ColumnInfo[] = result.rows.map((row) => ({
		name: row.name,
		type: parseColumnType(row.type),
		notNull: row.notnull === 1,
		defaultValue: parseDefaultValue(row.dflt_value),
		isPrimaryKey: row.pk === 1,
	}));

	const schema = { name: table, columns };
	SCHEMA_CACHE.set(table, schema);
	return schema;
}

export function clearSchemaCache(): void {
	SCHEMA_CACHE.clear();
}

export const getColumnNames = (schema: TableSchema): string[] => schema.columns.map((c) => c.name);

export const getPrimaryKeyColumns = (schema: TableSchema): string[] =>
	schema.columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

export function getRequiredColumns(schema: TableSchema): string[] {
	const pkColumns = schema.columns.filter((c) => c.isPrimaryKey);
	const rowidAliasName = pkColumns.length === 1 && pkColumns[0].type === "integer"
		? pkColumns[0].name
		: null;

	return schema.columns
		.filter((c) => {
			if (c.name === rowidAliasName) return false;
			if (c.isPrimaryKey) return true;
			return c.notNull && c.defaultValue === null;
		})
		.map((c) => c.name);
}

export function coerceValue(
	value: unknown,
	column: ColumnInfo,
): ColumnInfo["defaultValue"] {
	if (value === null || value === undefined) {
		return column.notNull && column.defaultValue !== null ? column.defaultValue : null;
	}

	const str = String(value);
	switch (column.type) {
		case "integer": {
			if (str === "") return null;
			const num = Number(str);
			if (Number.isInteger(num)) return num;
			try {
				return BigInt(str);
			} catch {
				return null;
			}
		}
		case "real": {
			const num = Number(str);
			return Number.isFinite(num) ? num : null;
		}
		case "boolean": {
			const lower = str.toLowerCase();
			if (lower === "true" || lower === "1" || lower === "t" || lower === "yes") return true;
			if (lower === "false" || lower === "0" || lower === "f" || lower === "no") return false;
			return null;
		}
		case "blob": {
			try {
				return JSON.parse(str);
			} catch {
				return str;
			}
		}
		default:
			return str;
	}
}
