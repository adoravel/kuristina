/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface RowChange {
	table: string;
	pk: Record<string, string | number>;
	before: Record<string, unknown> | null;
	after: Record<string, unknown> | null;
}

export interface MutationPlan {
	readonly id: string;
	readonly description: string;
	readonly changes: readonly RowChange[];
}

export function invertPlan(plan: MutationPlan): MutationPlan {
	return {
		id: crypto.randomUUID(),
		description: `undo: ${plan.description}`,
		changes: plan.changes.map((c) => ({
			table: c.table,
			pk: c.pk,
			before: c.after,
			after: c.before,
		})),
	};
}
