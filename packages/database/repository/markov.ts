/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { sql } from "@kysely/kysely";
import { Errors as Sql, type SqlError, tryQuery } from "@kuristina/database";
import { err, ok, type Result } from "@kuristina/core";
import { Repository } from "./helper.ts";

export interface MarkovLink {
	prefix: string;
	suffix: string;
	count: number;
}

export class MarkovRepository extends Repository {
	async learnWord(word: string): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("markov_words")
				.values({ word, count: 1 })
				.onConflict((oc) => oc.column("word").doUpdateSet((eb) => ({ count: eb("count", "+", 1) })))
				.execute()
		).then((r) => r.ok ? ok(undefined) : r);
	}

	async bulkLearnChain(
		entries: { prefix: string; suffix: string; count: number }[],
	): Promise<Result<void, SqlError>> {
		if (!entries.length) return ok(undefined);
		return await tryQuery(async () => {
			await this.database.transaction().execute(async (trx) => {
				for (const { prefix, suffix, count } of entries) {
					await trx.insertInto("markov_chain")
						.values({ prefix, suffix, count })
						.onConflict((oc) =>
							oc.columns(["prefix", "suffix"]).doUpdateSet((eb) => ({
								count: eb("count", "+", count),
							}))
						)
						.execute();
				}
			});
		}).then((r) => r.ok ? ok(undefined) : r);
	}

	async sampleWord(): Promise<Result<string, SqlError>> {
		const totalResult = await tryQuery(() =>
			this.database.selectFrom("markov_words")
				.select(({ fn }) => fn.sum<number>("count").as("total"))
				.executeTakeFirst()
		);
		if (!totalResult.ok) return totalResult;
		if (!totalResult.value?.total) {
			return err(Sql.queryFailed("sampleWord()", "12 reais :("));
		}

		const threshold = Math.floor(Math.random() * totalResult.value.total);

		const rowResult = await tryQuery(() =>
			this.database.selectFrom("markov_words")
				.select("word")
				.where(({ eb, selectFrom }) =>
					eb(
						selectFrom("markov_words as m2")
							.select(({ fn }) => fn.sum<number>("count").as("cum"))
							.whereRef("m2.word", "<=", "markov_words.word"),
						">",
						threshold,
					)
				)
				.orderBy("word")
				.limit(1)
				.executeTakeFirst()
		);
		if (!rowResult.ok) return rowResult;
		if (!rowResult.value?.word) return err(Sql.queryFailed("sampleWord()", "12 reais :("));

		return ok(rowResult.value.word);
	}

	async findLinksByPrefix(prefix: string): Promise<Result<MarkovLink[], SqlError>> {
		return await tryQuery(() =>
			this.database.selectFrom("markov_chain").select(["prefix", "suffix", "count"])
				.where("prefix", "=", prefix).execute()
		);
	}

	async findRandomSeedContaining(word: string): Promise<Result<MarkovLink[], SqlError>> {
		return await tryQuery(async () => {
			const matches = await sql<{ id: number }>`
				SELECT rowid as id FROM markov_chain_fts
				WHERE markov_chain_fts MATCH ${word + "*"}
				ORDER BY RANDOM() LIMIT 1
			`.execute(this.database);

			const id = matches.rows[0]?.id;
			if (!id) return [];

			return await this.database.selectFrom("markov_chain")
				.select(["prefix", "suffix", "count"])
				.where("id", "=", id)
				.execute();
		});
	}

	async maxChainId(): Promise<Result<number | null, SqlError>> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("markov_chain")
				.select(({ fn }) => fn.max("id").as("id")).executeTakeFirst();
			return row?.id ?? null;
		});
	}

	async findChainFromId(id: number): Promise<Result<MarkovLink[], SqlError>> {
		return await tryQuery(() =>
			this.database.selectFrom("markov_chain").select(["prefix", "suffix", "count"])
				.where("id", ">=", id).limit(1).execute()
		);
	}

	async forget(pattern: string): Promise<Result<number, SqlError>> {
		return await tryQuery(async () => {
			const like = `%${pattern}%`;
			const chainResult = await this.database.deleteFrom("markov_chain")
				.where((eb) => eb.or([eb("prefix", "like", like), eb("suffix", "like", like)]))
				.executeTakeFirst();
			const wordResult = await this.database.deleteFrom("markov_words")
				.where("word", "like", like)
				.executeTakeFirst();
			return Number(chainResult.numDeletedRows ?? 0n) + Number(wordResult.numDeletedRows ?? 0n);
		});
	}

	async pruneNoise(minCount: number): Promise<Result<number, SqlError>> {
		return await tryQuery(async () => {
			const result = await this.database.deleteFrom("markov_chain")
				.where("count", "<=", minCount)
				.executeTakeFirst();
			return Number(result.numDeletedRows ?? 0n);
		});
	}
}
