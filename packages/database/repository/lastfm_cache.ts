/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";

export class LastFmCacheRepository extends Repository {
	async get<T>(key: string, ttlSeconds: number): Promise<Result<T | null, SqlError>> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("lastfm_response_cache")
				.select(["payload", "cached_at"])
				.where("cache_key", "=", key)
				.executeTakeFirst();
			if (!row) return null;
			if (Math.floor(Date.now() / 1000) - row.cached_at > ttlSeconds) return null;
			return JSON.parse(row.payload) as T;
		});
	}

	async set<T>(key: string, value: T): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("lastfm_response_cache")
				.values({
					cache_key: key,
					payload: JSON.stringify(value),
					cached_at: Math.floor(Date.now() / 1000),
				})
				.onConflict((oc) =>
					oc.column("cache_key").doUpdateSet((eb) => ({
						payload: eb.ref("excluded.payload"),
						cached_at: eb.ref("excluded.cached_at"),
					}))
				)
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async delete(key: string): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.deleteFrom("lastfm_response_cache").where("cache_key", "=", key).execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async deleteWhereKeyContains(substring: string): Promise<Result<number, SqlError>> {
		return await tryQuery(async () => {
			const result = await this.database.deleteFrom("lastfm_response_cache")
				.where("cache_key", "like", `%${substring}%`)
				.executeTakeFirst();
			return Number(result.numDeletedRows ?? 0n);
		});
	}

	async purgeExpired(ttlSeconds: number): Promise<Result<number, SqlError>> {
		return await tryQuery(async () => {
			const cutoff = Math.floor(Date.now() / 1000) - ttlSeconds;
			const result = await this.database.deleteFrom("lastfm_response_cache")
				.where("cached_at", "<", cutoff).executeTakeFirst();
			return Number(result.numDeletedRows ?? 0n);
		});
	}
}
