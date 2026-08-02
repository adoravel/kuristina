/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";

export class StateRepository extends Repository {
	async get(key: string): Promise<Result<string | null, SqlError>> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("bot_state")
				.select("value").where("key", "=", key).executeTakeFirst();
			return row?.value ?? null;
		});
	}

	async set(key: string, value: string): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("bot_state")
				.values({ key, value })
				.onConflict((oc) =>
					oc.column("key").doUpdateSet((eb) => ({ value: eb.ref("excluded.value") }))
				)
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async delete(key: string): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.deleteFrom("bot_state").where("key", "=", key).execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}
}
