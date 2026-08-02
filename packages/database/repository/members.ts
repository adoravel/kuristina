/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";

export class GuildMemberRepository extends Repository {
	async setPresent(discordId: bigint, guildId: bigint): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("guild_members")
				.values({
					discord_id: discordId.toString(),
					guild_id: guildId.toString(),
					joined_at: Math.floor(Date.now() / 1000),
				})
				.onConflict((oc) => oc.columns(["discord_id", "guild_id"]).doNothing())
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async setAbsent(discordId: bigint, guildId: bigint): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.deleteFrom("guild_members")
				.where("discord_id", "=", discordId.toString())
				.where("guild_id", "=", guildId.toString())
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async reconcileGuild(
		guildId: bigint,
		memberIds: ReadonlySet<bigint>,
	): Promise<Result<{ added: number; removed: number }, SqlError>> {
		return await tryQuery(async () => {
			const existingRows = await this.database.selectFrom("guild_members")
				.select("discord_id")
				.where("guild_id", "=", guildId.toString())
				.execute();

			const existing = new Set(existingRows.map((r) => r.discord_id));
			const toAdd = [...memberIds].filter((id) => !existing.has(id.toString()));
			const toRemove = [...existing].filter((id) => !memberIds.has(BigInt(id)));
			const now = Math.floor(Date.now() / 1000);

			await this.database.transaction().execute(async (trx) => {
				if (toAdd.length) {
					await trx.insertInto("guild_members")
						.values(toAdd.map((id) => ({
							discord_id: id.toString(),
							guild_id: guildId.toString(),
							joined_at: now,
						})))
						.onConflict((oc) => oc.columns(["discord_id", "guild_id"]).doNothing())
						.execute();
				}
				for (const id of toRemove) {
					await trx.deleteFrom("guild_members")
						.where("discord_id", "=", id)
						.where("guild_id", "=", guildId.toString())
						.execute();
				}
			});

			return { added: toAdd.length, removed: toRemove.length };
		});
	}
}
