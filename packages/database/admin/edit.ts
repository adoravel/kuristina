/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { database, type SqlError, tryQuery } from "@kuristina/database";
import { ok, type Result } from "@kuristina/core";
import { assertEditable } from "./candidates.ts";
import type { MutationPlan } from "./plan.ts";

export async function applyPlan(plan: MutationPlan): Promise<Result<void, SqlError>> {
	return await tryQuery(() =>
		database.transaction().execute(async (trx) => {
			for (const change of plan.changes) {
				assertEditable(change.table);

				if (change.after === null) {
					let q = trx.deleteFrom(change.table);
					for (const [col, val] of Object.entries(change.pk)) {
						q = q.where(col as never, "=", val as never);
					}
					await q.execute();
				} else if (change.before === null) {
					await trx.insertInto(change.table).values(change.after).execute();
				} else {
					let q = trx.updateTable(change.table).set(change.after);
					for (const [col, val] of Object.entries(change.pk)) {
						q = q.where(col as never, "=", val as never);
					}
					await q.execute();
				}
			}
		})
	).then((r) => (r.ok ? ok(undefined) : r));
}
