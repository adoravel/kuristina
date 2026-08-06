/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { randomUUID } from "node:crypto";
import type { JsonValue, MutationPlan, RowChange } from "./types.ts";

export function createPlan(
	description: string,
	changes: RowChange[],
	id?: string,
): MutationPlan {
	return {
		id: id ?? randomUUID(),
		description,
		changes,
		createdAt: Date.now(),
	};
}

export function invertPlan(plan: MutationPlan): MutationPlan {
	return {
		id: randomUUID(),
		description: `undo: ${plan.description}`,
		changes: plan.changes.map((c) => ({
			table: c.table,
			pk: c.pk,
			before: c.after,
			after: c.before,
		})),
		createdAt: Date.now(),
	};
}

export function createInsertPlan(
	table: string,
	data: Record<string, JsonValue>,
	description?: string,
): MutationPlan {
	return createPlan(
		description ?? `insert into ${table}`,
		[
			{
				table,
				pk: {},
				before: null,
				after: data,
			},
		],
	);
}

export function createUpdatePlan(
	table: string,
	pk: Record<string, JsonValue>,
	before: Record<string, JsonValue>,
	after: Record<string, JsonValue>,
	description?: string,
): MutationPlan {
	return createPlan(
		description ?? `update ${table}`,
		[
			{
				table,
				pk: pk as any,
				before,
				after,
			},
		],
	);
}

export function createDeletePlan(
	table: string,
	pk: Record<string, JsonValue>,
	before: Record<string, JsonValue>,
	description?: string,
): MutationPlan {
	return createPlan(
		description ?? `delete from ${table}`,
		[
			{
				table,
				pk: pk as any,
				before,
				after: null,
			},
		],
	);
}
