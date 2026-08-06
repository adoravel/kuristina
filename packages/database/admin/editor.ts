/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { database } from "@kuristina/database";
import { err, ok, type Result } from "@kuristina/core";
import type { SqlError } from "@kuristina/database";
import { assertEditableTable, validateAndGetSchema } from "./guard.ts";
import { coerceValue, getColumnNames, getPrimaryKeyColumns } from "./schema.ts";
import type { JsonValue, MutationPlan, RowChange, TableSchema } from "./types.ts";
import { sql } from "@kysely/kysely";

export type EditError = SqlError | { kind: "validation"; message: string };

export const isEditError = (e: unknown): e is EditError =>
	typeof e === "object" &&
	e !== null &&
	"kind" in e &&
	(e.kind === "validation" || e.kind === "sql");

type QueryExecutor = Pick<
	typeof database,
	"selectFrom" | "insertInto" | "updateTable" | "deleteFrom"
>;

interface GroupedOps {
	inserts: Record<string, JsonValue>[];
	updates: Array<{ pk: Record<string, JsonValue>; data: Record<string, JsonValue> }>;
	deletes: Record<string, JsonValue>[];
}

interface UniqueConstraint {
	name: string;
	columns: string[];
}

interface IndexInfo {
	name: string;
	sql: string | null;
}

const UNIQUE_CONSTRAINTS_CACHE = new Map<string, UniqueConstraint[]>();

async function getUniqueConstraints(table: string): Promise<UniqueConstraint[]> {
	const cached = UNIQUE_CONSTRAINTS_CACHE.get(table);
	if (cached) return cached;

	const result = await sql<IndexInfo>`
		SELECT name, sql FROM sqlite_master 
		WHERE type = 'index' AND sql LIKE '%UNIQUE%' AND tbl_name = ${table}
	`.execute(database);

	const constraints: UniqueConstraint[] = [];
	for (const row of result.rows) {
		if (!row.sql) continue;
		const match = row.sql.match(/\(([^)]+)\)/);
		if (match) {
			const columns = match[1].split(",").map((c: string) => c.trim().replace(/["']/g, ""));
			constraints.push({ name: row.name, columns });
		}
	}

	UNIQUE_CONSTRAINTS_CACHE.set(table, constraints);
	return constraints;
}

function findMatchingConstraint(
	pk: Record<string, JsonValue>,
	uniqueConstraints: UniqueConstraint[],
): Record<string, JsonValue> | null {
	for (const constraint of uniqueConstraints) {
		const matched = Object.fromEntries(
			Object.entries(pk).filter(([k]) => constraint.columns.includes(k)),
		);
		if (Object.keys(matched).length === constraint.columns.length) {
			return matched;
		}
	}
	return null;
}

function validatePrimaryKeyConditions(
	pk: Record<string, JsonValue>,
	primaryKeys: string[],
	uniqueConstraints: UniqueConstraint[] = [],
): Record<string, JsonValue> {
	const conditions = Object.fromEntries(
		Object.entries(pk).filter(([k]) => primaryKeys.includes(k)),
	);

	if (!Object.keys(conditions).length) {
		const matched = findMatchingConstraint(pk, uniqueConstraints);
		if (matched) return matched;
	}

	if (!Object.keys(conditions).length) {
		throw {
			kind: "validation",
			message: "No primary key or unique constraint conditions provided",
		};
	}
	return conditions;
}

function groupChanges(changes: readonly RowChange[]): Map<string, GroupedOps> {
	const groups = new Map<string, GroupedOps>();

	for (const change of changes) {
		if (!groups.has(change.table)) {
			groups.set(change.table, { inserts: [], updates: [], deletes: [] });
		}

		const entry = groups.get(change.table)!;

		if (change.after === null) {
			entry.deletes.push(change.pk);
		} else if (change.before === null) {
			entry.inserts.push(change.after);
		} else {
			entry.updates.push({ pk: change.pk, data: change.after });
		}
	}

	return groups;
}

function validateUpdateData(
	data: Record<string, JsonValue>,
	columns: string[],
	primaryKeys: string[],
	schema: TableSchema,
): Record<string, JsonValue> {
	const updateData = Object.fromEntries(
		Object.entries(data)
			.filter(([k]) => columns.includes(k) && !primaryKeys.includes(k))
			.map(([k, v]) => {
				const col = schema.columns.find((c) => c.name === k)!;
				return [k, coerceValue(v, col)];
			}),
	);

	if (!Object.keys(updateData).length) {
		throw { kind: "validation", message: "No updatable columns provided" };
	}

	return updateData;
}

function validateInsertData(
	data: Record<string, JsonValue>,
	columns: string[],
	schema: TableSchema,
): Record<string, JsonValue> {
	return Object.fromEntries(
		Object.entries(data)
			.filter(([k]) => columns.includes(k))
			.map(([k, v]) => {
				const col = schema.columns.find((c) => c.name === k)!;
				return [k, coerceValue(v, col)];
			}),
	);
}

function describePk(pk: Record<string, JsonValue>): string {
	return Object.entries(pk).map(([k, v]) => `${k}=${v}`).join(" ");
}

async function buildDeleteQuery(
	db: QueryExecutor,
	table: string,
	pk: Record<string, JsonValue>,
	primaryKeys: string[],
) {
	const uniqueConstraints = await getUniqueConstraints(table);
	const conditions = validatePrimaryKeyConditions(pk, primaryKeys, uniqueConstraints);

	let query = db.deleteFrom(table as never);
	for (const [col, val] of Object.entries(conditions)) {
		query = query.where(col as never, "=", val as never);
	}
	return query;
}

async function buildUpdateQuery(
	db: QueryExecutor,
	table: string,
	pk: Record<string, JsonValue>,
	data: Record<string, JsonValue>,
	primaryKeys: string[],
	columns: string[],
	schema: TableSchema,
) {
	const uniqueConstraints = await getUniqueConstraints(table);
	const conditions = validatePrimaryKeyConditions(pk, primaryKeys, uniqueConstraints);
	const updateData = validateUpdateData(data, columns, primaryKeys, schema);

	let query = db.updateTable(table as never).set(updateData);
	for (const [col, val] of Object.entries(conditions)) {
		query = query.where(col as never, "=", val as never);
	}
	return query;
}

async function executeInserts(
	db: QueryExecutor,
	table: string,
	rows: Record<string, JsonValue>[],
	schema: TableSchema,
): Promise<number> {
	if (!rows.length) return 0;

	const columns = getColumnNames(schema);
	const validRows = rows.map((data) => validateInsertData(data, columns, schema));

	logger.info(`admin: inserting ${validRows.length} rows into ${table}`);
	await db.insertInto(table as never).values(validRows).execute();
	logger.yay(`admin: inserted ${validRows.length} rows into ${table}`);

	return validRows.length;
}

async function executeUpdates(
	db: QueryExecutor,
	table: string,
	updates: Array<{ pk: Record<string, JsonValue>; data: Record<string, JsonValue> }>,
	schema: TableSchema,
): Promise<number> {
	if (!updates.length) return 0;

	const columns = getColumnNames(schema);
	const primaryKeys = getPrimaryKeyColumns(schema);
	let count = 0;

	logger.info(`admin: updating ${updates.length} rows in ${table}`);

	for (const { pk, data } of updates) {
		const query = await buildUpdateQuery(db, table, pk, data, primaryKeys, columns, schema);
		const result = await query.executeTakeFirst();
		const affected = Number(result.numUpdatedRows ?? 0);

		if (affected !== 1) {
			throw {
				kind: "validation",
				message: `expected to update exactly 1 row in ${table} (${
					describePk(pk)
				}), affected ${affected}. the row may have changed since this was previewed`,
			};
		}

		count += affected;
	}

	logger.yay(`admin: updated ${count} rows in ${table}`);
	return count;
}

async function executeDeletes(
	db: QueryExecutor,
	table: string,
	pks: Record<string, JsonValue>[],
	schema: TableSchema,
): Promise<number> {
	if (!pks.length) return 0;

	const primaryKeys = getPrimaryKeyColumns(schema);
	let count = 0;

	logger.warn(`admin: deleting ${pks.length} rows from ${table}`);

	for (const pk of pks) {
		const query = await buildDeleteQuery(db, table, pk, primaryKeys);
		const result = await query.executeTakeFirst();
		const affected = Number(result.numDeletedRows ?? 0);

		if (affected !== 1) {
			throw {
				kind: "validation",
				message: `expected to delete exactly 1 row in ${table} (${
					describePk(pk)
				}), affected ${affected}. the row may have already been removed`,
			};
		}

		count += affected;
	}

	logger.yay(`admin: deleted ${count} rows from ${table}`);
	return count;
}

async function executeGroupedOps(
	db: QueryExecutor,
	table: string,
	ops: GroupedOps,
): Promise<{ inserted: number; updated: number; deleted: number }> {
	logger.info(
		`admin: processing ${table} (${ops.inserts.length} inserts, ${ops.updates.length} updates, ${ops.deletes.length} deletes)`,
	);

	const schema = await validateAndGetSchema(table);

	const deleted = await executeDeletes(db, table, ops.deletes, schema);
	const updated = await executeUpdates(db, table, ops.updates, schema);
	const inserted = await executeInserts(db, table, ops.inserts, schema);

	logger.yay(`admin: ${table} done (${inserted} inserted, ${updated} updated, ${deleted} deleted)`);

	return { inserted, updated, deleted };
}

export async function applyPlan(plan: MutationPlan): Promise<Result<void, EditError>> {
	const start = performance.now();
	logger.info(`admin: applying plan "${plan.description}" (${plan.changes.length} changes)`);

	try {
		const groups = groupChanges(plan.changes);
		for (const [table] of groups) assertEditableTable(table);

		await database.transaction().execute(async (trx) => {
			for (const [table, ops] of groups) {
				await executeGroupedOps(trx, table, ops);
			}
		});

		const elapsed = (performance.now() - start).toFixed(2);
		logger.yay(`admin: plan applied in ${elapsed}ms`);

		return ok(undefined);
	} catch (e) {
		const elapsed = (performance.now() - start).toFixed(2);
		logger.boo(`admin: plan failed after ${elapsed}ms, rolled back:`, e);

		if (isEditError(e)) return err(e);
		return err({ kind: "validation", message: String(e) });
	}
}

export async function deleteSingleRow(
	table: string,
	pk: Record<string, JsonValue>,
): Promise<void> {
	logger.warn(`admin: deleting single row from ${table}: ${JSON.stringify(pk)}`);

	const schema = await validateAndGetSchema(table);
	const primaryKeys = getPrimaryKeyColumns(schema);
	const query = await buildDeleteQuery(database, table, pk, primaryKeys);
	const result = await query.executeTakeFirst();

	if (Number(result.numDeletedRows ?? 0) === 0) {
		logger.boo(`admin: no rows deleted from ${table}`);
		throw { kind: "validation", message: "No rows were deleted" };
	}

	logger.yay(`admin: deleted row from ${table}`);
}

export async function insertSingleRow(
	table: string,
	data: Record<string, JsonValue>,
): Promise<void> {
	logger.info(`admin: inserting single row into ${table}: ${JSON.stringify(data)}`);

	const schema = await validateAndGetSchema(table);
	const columns = getColumnNames(schema);
	const validData = validateInsertData(data, columns, schema);
	await database.insertInto(table as never).values(validData).execute();

	logger.yay(`admin: inserted row into ${table}`);
}

export async function updateSingleRow(
	table: string,
	pk: Record<string, JsonValue>,
	data: Record<string, JsonValue>,
): Promise<void> {
	logger.info(`admin: updating single row in ${table}: ${JSON.stringify(pk)}`);

	const schema = await validateAndGetSchema(table);
	const columns = getColumnNames(schema);
	const primaryKeys = getPrimaryKeyColumns(schema);
	const query = await buildUpdateQuery(database, table, pk, data, primaryKeys, columns, schema);
	const result = await query.executeTakeFirst();

	if (Number(result.numUpdatedRows ?? 0) === 0) {
		logger.boo(`admin: no rows updated in ${table}`);
		throw { kind: "validation", message: "No rows were updated" };
	}

	logger.yay(`admin: updated row in ${table}`);
}
