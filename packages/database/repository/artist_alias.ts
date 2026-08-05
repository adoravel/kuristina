/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, ok } from "@kuristina/core";
import { tryQuery } from "@kuristina/database";
import type { SqlError } from "../errors.ts";
import { Repository } from "./helper.ts";

export class ArtistAliasRepository extends Repository {
	private key(name: string): string {
		return name.trim().toLowerCase();
	}

	async getGroup(name: string): AsyncResult<string[], SqlError> {
		return await tryQuery(async () => {
			const own = await this.database.selectFrom("artist_aliases")
				.select("group_id").where("name_key", "=", this.key(name)).executeTakeFirst();
			if (!own) return [name];

			const members = await this.database.selectFrom("artist_aliases")
				.select("display_name").where("group_id", "=", own.group_id).execute();
			return members.map((m) => m.display_name);
		});
	}

	async link(a: string, b: string, source: "autocorrect" | "manual"): AsyncResult<void, SqlError> {
		if (this.key(a) === this.key(b)) return ok(undefined);

		return await tryQuery(async () => {
			await this.database.transaction().execute(async (trx) => {
				const [rowA, rowB] = await Promise.all([
					trx.selectFrom("artist_aliases").select(["group_id"]).where("name_key", "=", this.key(a))
						.executeTakeFirst(),
					trx.selectFrom("artist_aliases").select(["group_id"]).where("name_key", "=", this.key(b))
						.executeTakeFirst(),
				]);

				if (rowA && rowB && rowA.group_id === rowB.group_id) return;

				let groupId: number;
				if (rowA) groupId = rowA.group_id;
				else if (rowB) groupId = rowB.group_id;
				else {
					const created = await trx.insertInto("artist_alias_groups")
						.values({ created_at: Math.floor(Date.now() / 1000) })
						.executeTakeFirstOrThrow();
					groupId = Number(created.insertId);
				}

				if (rowA && rowB && rowA.group_id !== rowB.group_id) {
					const loser = groupId === rowA.group_id ? rowB.group_id : rowA.group_id;
					await trx.updateTable("artist_aliases").set({ group_id: groupId })
						.where("group_id", "=", loser).execute();
					await trx.deleteFrom("artist_alias_groups").where("id", "=", loser).execute();
				}

				for (const [name, source_] of [[a, source], [b, source]] as const) {
					await trx.insertInto("artist_aliases")
						.values({
							name_key: this.key(name),
							display_name: name,
							group_id: groupId,
							source: source_,
						})
						.onConflict((oc) =>
							oc.column("name_key").doUpdateSet((eb) => ({
								display_name: eb.ref("excluded.display_name"),
							}))
						)
						.execute();
				}
			});
		}).then((r) => (r.ok ? ok(undefined) : r));
	}
}
