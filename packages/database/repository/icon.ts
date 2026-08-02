/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";

export interface IconRow {
	emojiId: string;
	animated: boolean;
	sourceHash: string;
}

export class IconRepository extends Repository {
	async getAll(): Promise<Result<Map<string, IconRow>, SqlError>> {
		return await tryQuery(async () => {
			const rows = await this.database.selectFrom("icon_emojis")
				.select(["name", "emoji_id", "animated", "source_hash"])
				.execute();
			return new Map(rows.map((r) => [
				r.name,
				{ emojiId: r.emoji_id, animated: !!r.animated, sourceHash: r.source_hash },
			]));
		});
	}

	async upsert(
		name: string,
		emojiId: string,
		animated: boolean,
		sourceHash: string,
	): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("icon_emojis")
				.values({
					name,
					emoji_id: emojiId,
					animated: animated ? 1 : 0,
					source_hash: sourceHash,
					uploaded_at: Math.floor(Date.now() / 1000),
				})
				.onConflict((oc) =>
					oc.column("name").doUpdateSet((eb) => ({
						emoji_id: eb.ref("excluded.emoji_id"),
						animated: eb.ref("excluded.animated"),
						source_hash: eb.ref("excluded.source_hash"),
						uploaded_at: eb.ref("excluded.uploaded_at"),
					}))
				)
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}
}
