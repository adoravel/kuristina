/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";
import type { MusicLinkResult } from "@kuristina/services/musiclinks";
import { config } from "@kuristina/config";

export class MusicLinkRepository extends Repository {
	async get(sourceUrl: string): Promise<Result<MusicLinkResult | null, SqlError>> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("music_link_cache")
				.select(["payload", "cached_at"]).where("source_url", "=", sourceUrl).executeTakeFirst();
			if (!row) return null;
			if (Math.floor(Date.now() / 1000) - row.cached_at > config.sqlite.musicLinkCacheTtlSeconds) {
				return null;
			}
			return JSON.parse(row.payload) as MusicLinkResult;
		});
	}

	async set(sourceUrl: string, result: MusicLinkResult): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("music_link_cache")
				.values({
					source_url: sourceUrl,
					payload: JSON.stringify(result),
					cached_at: Math.floor(Date.now() / 1000),
				})
				.onConflict((oc) =>
					oc.column("source_url").doUpdateSet((eb) => ({
						payload: eb.ref("excluded.payload"),
						cached_at: eb.ref("excluded.cached_at"),
					}))
				)
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async purgeExpired(ttlSeconds: number): Promise<Result<number, SqlError>> {
		return await tryQuery(async () => {
			const cutoff = Math.floor(Date.now() / 1000) - ttlSeconds;
			const result = await this.database.deleteFrom("music_link_cache")
				.where("cached_at", "<", cutoff).executeTakeFirst();
			return Number(result.numDeletedRows ?? 0n);
		});
	}
}
