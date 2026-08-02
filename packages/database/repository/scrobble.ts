/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import type { ScrobbleProviderName } from "@kuristina/services/scrobbling";
import { Repository } from "./helper.ts";

export interface ScrobbleAccount {
	provider: ScrobbleProviderName;
	username: string;
	isDefault: boolean;
}

export class ScrobbleAccountRepository extends Repository {
	async link(
		discordId: bigint,
		provider: ScrobbleProviderName,
		username: string,
		makeDefault: boolean,
	): Promise<Result<void, SqlError>> {
		return await tryQuery(async () => {
			await this.database.transaction().execute(async (trx) => {
				if (makeDefault) {
					await trx.updateTable("scrobble_accounts")
						.set({ is_default: 0 })
						.where("discord_id", "=", discordId.toString())
						.execute();
				}
				await trx.insertInto("scrobble_accounts")
					.values({
						discord_id: discordId.toString(),
						provider,
						username,
						is_default: makeDefault ? 1 : 0,
						linked_at: Math.floor(Date.now() / 1000),
					})
					.onConflict((oc) =>
						oc.columns(["discord_id", "provider"]).doUpdateSet((eb) => ({
							username: eb.ref("excluded.username"),
							is_default: eb.ref("excluded.is_default"),
							linked_at: eb.ref("excluded.linked_at"),
						}))
					)
					.execute();
			});
		}).then((r) => (r.ok ? ok(undefined) : r));
	}

	async unlink(discordId: bigint, provider: ScrobbleProviderName): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.deleteFrom("scrobble_accounts")
				.where("discord_id", "=", discordId.toString())
				.where("provider", "=", provider)
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async getDefault(discordId: bigint): Promise<Result<ScrobbleAccount | null, SqlError>> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("scrobble_accounts")
				.select(["provider", "username", "is_default"])
				.where("discord_id", "=", discordId.toString())
				.orderBy("is_default", "desc")
				.limit(1)
				.executeTakeFirst();

			return row
				? {
					provider: row.provider as ScrobbleProviderName,
					username: row.username,
					isDefault: !!row.is_default,
				}
				: null;
		});
	}

	async getUsernamesForMembers(
		discordIds: bigint[],
		provider: ScrobbleProviderName,
	): Promise<Result<Map<bigint, string>, SqlError>> {
		if (!discordIds.length) return ok(new Map());
		return await tryQuery(async () => {
			const encoded = discordIds.map((id) => id);
			const rows = await this.database.selectFrom("scrobble_accounts")
				.select(["discord_id", "username"])
				.where("provider", "=", provider)
				.where("discord_id", "in", encoded as any)
				.execute();

			return new Map(rows.map((r) => [BigInt(r.discord_id), r.username]));
		});
	}

	async getAllForProviderInGuild(
		provider: ScrobbleProviderName,
		guildId: bigint,
	): Promise<Result<Map<bigint, string>, SqlError>> {
		return await tryQuery(async () => {
			const rows = await this.database.selectFrom("scrobble_accounts")
				.innerJoin("guild_members", "guild_members.discord_id", "scrobble_accounts.discord_id")
				.select(["scrobble_accounts.discord_id", "scrobble_accounts.username"])
				.where("scrobble_accounts.provider", "=", provider)
				.where("guild_members.guild_id", "=", guildId.toString())
				.execute();
			return new Map(rows.map((r) => [BigInt(r.discord_id), r.username]));
		});
	}
}
