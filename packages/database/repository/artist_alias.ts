/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, ok } from "@kuristina/core";
import { tryQuery } from "@kuristina/database";
import type { SqlError } from "../errors.ts";
import { Repository } from "./helper.ts";

export interface ArtistAlias {
	nameKey: string;
	displayName: string;
	groupId: number;
	source: "autocorrect" | "manual";
	skipAutocorrect: boolean;
}

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

	async getCanonical(name: string): AsyncResult<string, SqlError> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("artist_aliases")
				.select(["display_name", "group_id"])
				.where("name_key", "=", this.key(name))
				.executeTakeFirst();

			if (!row) return name;

			const members = await this.database.selectFrom("artist_aliases")
				.select("display_name")
				.where("group_id", "=", row.group_id)
				.orderBy("source", "asc")
				.executeTakeFirst();

			return members?.display_name ?? name;
		});
	}

	async shouldSkipAutocorrect(name: string): AsyncResult<boolean, SqlError> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("artist_aliases")
				.select("skip_autocorrect")
				.where("name_key", "=", this.key(name))
				.executeTakeFirst();

			return row?.skip_autocorrect === 1;
		});
	}

	async getAll(): AsyncResult<ArtistAlias[], SqlError> {
		return await tryQuery(async () => {
			const rows = await this.database.selectFrom("artist_aliases")
				.select(["name_key", "display_name", "group_id", "source", "skip_autocorrect"])
				.orderBy("display_name")
				.execute();

			return rows.map((r) => ({
				nameKey: r.name_key,
				displayName: r.display_name,
				groupId: r.group_id,
				source: r.source as "autocorrect" | "manual",
				skipAutocorrect: r.skip_autocorrect === 1,
			}));
		});
	}

	async getByGroup(groupId: number): AsyncResult<ArtistAlias[], SqlError> {
		return await tryQuery(async () => {
			const rows = await this.database.selectFrom("artist_aliases")
				.select(["name_key", "display_name", "group_id", "source", "skip_autocorrect"])
				.where("group_id", "=", groupId)
				.orderBy("display_name")
				.execute();

			return rows.map((r) => ({
				nameKey: r.name_key,
				displayName: r.display_name,
				groupId: r.group_id,
				source: r.source as "autocorrect" | "manual",
				skipAutocorrect: r.skip_autocorrect === 1,
			}));
		});
	}

	async link(
		a: string,
		b: string,
		source: "autocorrect" | "manual",
		skipAutocorrect = false,
	): AsyncResult<void, SqlError> {
		if (this.key(a) === this.key(b)) return ok(undefined);

		return await tryQuery(async () => {
			await this.database.transaction().execute(async (trx) => {
				const [rowA, rowB] = await Promise.all([
					trx.selectFrom("artist_aliases").select(["group_id", "skip_autocorrect"])
						.where("name_key", "=", this.key(a)).executeTakeFirst(),
					trx.selectFrom("artist_aliases").select(["group_id", "skip_autocorrect"])
						.where("name_key", "=", this.key(b)).executeTakeFirst(),
				]);

				if (rowA && rowB && rowA.group_id === rowB.group_id) {
					// Update skip_autocorrect if needed
					if (skipAutocorrect && !rowA.skip_autocorrect) {
						await trx.updateTable("artist_aliases")
							.set({ skip_autocorrect: 1 })
							.where("group_id", "=", rowA.group_id)
							.execute();
					}
					return;
				}

				let groupId: number;
				let shouldSkip = skipAutocorrect;
				if (rowA) {
					groupId = rowA.group_id;
					shouldSkip = shouldSkip || rowA.skip_autocorrect === 1;
				} else if (rowB) {
					groupId = rowB.group_id;
					shouldSkip = shouldSkip || rowB.skip_autocorrect === 1;
				} else {
					const created = await trx.insertInto("artist_alias_groups")
						.values({ created_at: Math.floor(Date.now() / 1000) })
						.executeTakeFirstOrThrow();
					groupId = Number(created.insertId);
				}

				if (rowA && rowB && rowA.group_id !== rowB.group_id) {
					const loser = groupId === rowA.group_id ? rowB.group_id : rowA.group_id;
					shouldSkip = shouldSkip || rowA.skip_autocorrect === 1 || rowB.skip_autocorrect === 1;
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
							skip_autocorrect: shouldSkip ? 1 : 0,
						})
						.onConflict((oc) =>
							oc.column("name_key").doUpdateSet((eb) => ({
								display_name: eb.ref("excluded.display_name"),
								group_id: eb.ref("excluded.group_id"),
								source: eb.ref("excluded.source"),
								skip_autocorrect: eb.ref("excluded.skip_autocorrect"),
							}))
						)
						.execute();
				}
			});
		}).then((r) => (r.ok ? ok(undefined) : r));
	}

	async setSkipAutocorrect(name: string, skip: boolean): AsyncResult<void, SqlError> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("artist_aliases")
				.select("group_id")
				.where("name_key", "=", this.key(name))
				.executeTakeFirst();

			if (!row) {
				throw new Error(`No alias found for "${name}"`);
			}

			await this.database.updateTable("artist_aliases")
				.set({ skip_autocorrect: skip ? 1 : 0 })
				.where("group_id", "=", row.group_id)
				.execute();
		}).then((r) => (r.ok ? ok(undefined) : r));
	}
}
