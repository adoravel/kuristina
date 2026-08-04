/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";

export class GuildProfileRepository extends Repository {
	async getHash(guildId: bigint): Promise<Result<string | null, SqlError>> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("guild_profile_syncs")
				.select("params_hash")
				.where("guild_id", "=", guildId.toString())
				.executeTakeFirst();
			return row?.params_hash ?? null;
		});
	}

	async setHash(guildId: bigint, hash: string): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("guild_profile_syncs")
				.values({
					guild_id: guildId.toString(),
					params_hash: hash,
					synced_at: Math.floor(Date.now() / 1000),
				})
				.onConflict((oc) =>
					oc.column("guild_id").doUpdateSet((eb) => ({
						params_hash: eb.ref("excluded.params_hash"),
						synced_at: eb.ref("excluded.synced_at"),
					}))
				)
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}
}
