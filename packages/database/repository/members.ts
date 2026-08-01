/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { decodeSnowflake, encodeSnowflake, type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";

export class GuildMemberRepository extends Repository {
	async setPresent(discordId: bigint, guildId: bigint): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("guild_members")
				.values({
					discord_id: encodeSnowflake(discordId) as any,
					guild_id: encodeSnowflake(guildId) as any,
					joined_at: Math.floor(Date.now() / 1000),
				})
				.onConflict((oc) => oc.columns(["discord_id", "guild_id"]).doNothing())
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async setAbsent(discordId: bigint, guildId: bigint): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.deleteFrom("guild_members")
				.where("discord_id", "=", encodeSnowflake(discordId) as any)
				.where("guild_id", "=", encodeSnowflake(guildId) as any)
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async reconcileGuild(
		guildId: bigint,
		memberIds: ReadonlySet<bigint>,
	): Promise<Result<{ added: number; removed: number }, SqlError>> {
		return await tryQuery(async () => {
			const snowflake = encodeSnowflake(guildId);
			const existingRows = await this.database.selectFrom("guild_members")
				.select("discord_id")
				.where("guild_id", "=", snowflake as any)
				.execute();

			const existing = new Set(
				existingRows.map((r) => decodeSnowflake(r.discord_id as Uint8Array)),
			);

			const toAdd = [...memberIds].filter((id) => !existing.has(id));
			const toRemove = [...existing].filter((id) => !memberIds.has(id));
			const now = Math.floor(Date.now() / 1000);

			await this.database.transaction().execute(async (trx) => {
				if (toAdd.length) {
					await trx.insertInto("guild_members")
						.values(toAdd.map((id) => ({
							discord_id: encodeSnowflake(id) as any,
							guild_id: snowflake as any,
							joined_at: now,
						})))
						.onConflict((oc) => oc.columns(["discord_id", "guild_id"]).doNothing())
						.execute();
				}
				for (const id of toRemove) {
					await trx.deleteFrom("guild_members")
						.where("discord_id", "=", encodeSnowflake(id) as any)
						.where("guild_id", "=", snowflake as any)
						.execute();
				}
			});

			return { added: toAdd.length, removed: toRemove.length };
		});
	}
}
