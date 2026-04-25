/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { search, sql, transaction } from "~/database/mod.ts";
import { discard, Fail, Ok, type Result, tapError } from "~/lib/result.ts";
import { Errors } from "~/lib/errors.ts";
import { SqlError } from "~/database/errors.ts";

const MAX_GENERATION_LENGTH = 420;

export interface MarkovLink {
	prefix: string;
	suffix: string;
	count: number;
}

function sanitize(text: string): string {
	return text.replace(/`{1,3}[\s\S]*?`{1,3}/g, "") // Remove code blocks
		.trim();
}

function tokenize(text: string): string[] {
	return text.split(/\s+/).filter(Boolean);
}

export function learn(text: string): Result<void, SqlError> {
	const clean = sanitize(text);
	const tokens = tokenize(clean);

	if (!tokens.length) return Ok(undefined);
	if (tokens.length === 1) {
		return discard(
			sql(
				`INSERT INTO markov_words (word, count) VALUES (?, 1)
			 	ON CONFLICT(word) DO UPDATE SET count = count + 1`,
				tokens[0],
			),
		);
	}

	if (tokens.length <= 2 && !/https?:\/\/\S+/.test(clean)) {
		return Ok(undefined);
	}

	const chain: MarkovLink[] = [];
	for (let i = 0; i < Math.max(tokens.length - 2, 3); i++) {
		chain.push({
			prefix: `${tokens[i] || tokens[0]} ${tokens[i + 1] || [tokens[0]]}`,
			suffix: tokens[i + 2] || tokens[0],
			count: 1,
		});
	}

	return Ok(transaction(() => {
		for (const link of chain) {
			sql(
				`
                INSERT INTO markov_chain (prefix, suffix, count)
                VALUES (?, ?, 1)
                ON CONFLICT(prefix, suffix) DO UPDATE SET count = count + 1
            `,
				link.prefix,
				link.suffix,
			);
		}
	}));
}

export function sampleWord(): Result<string | null, SqlError> {
	const total = search<{ total: number }>("SELECT SUM(count) as total FROM markov_words");
	if (!total.ok) return total;
	if (!total.value[0]?.total) return Ok(null);

	const threshold = Math.floor(Math.random() * total.value[0].total);
	const row = search<{ word: string }>(
		`SELECT word FROM markov_words
		 WHERE (SELECT SUM(m2.count) FROM markov_words m2 WHERE m2.word <= markov_words.word) > ?
		 ORDER BY word LIMIT 1`,
		threshold,
	);

	if (!row.ok) return row;
	return Ok(row.value[0]?.word ?? null);
}

export function bulkLearn(messages: string[]): Result<void, SqlError> {
	const tallies = new Map<string, Map<string, number>>();

	for (const msg of messages) {
		const clean = sanitize(msg);
		const tokens = tokenize(clean);

		if (tokens.length < 2) continue;

		for (let i = 0; i < tokens.length - 2; i++) {
			const prefix = `${tokens[i]} ${tokens[i + 1]}`;
			const suffix = tokens[i + 2];

			const prefixMap = tallies.get(prefix) ?? new Map<string, number>();
			prefixMap.set(suffix, (prefixMap.get(suffix) ?? 0) + 1);

			tallies.set(prefix, prefixMap);
		}
	}

	return Ok(transaction(() => {
		for (const [prefix, suffixes] of tallies) {
			for (const [suffix, count] of suffixes) {
				sql(
					`
                INSERT INTO markov_chain (prefix, suffix, count)
                VALUES (?, ?, ?)
                ON CONFLICT(prefix, suffix) DO UPDATE SET count = count + excluded.count
                `,
					prefix,
					suffix,
					count,
				);
			}
		}
	}));
}

export function generate(bias?: string): Result<string, SqlError> {
	try {
		let begin = bias;
		if (bias) {
			const word = bias.trim();
			const seed = tapError<MarkovLink[], SqlError>(console.error)(search<MarkovLink>(
				"SELECT prefix FROM markov_chain WHERE prefix LIKE ? ORDER BY RANDOM() LIMIT 1",
				`%${word}%`,
			));
			begin = seed.ok && seed.value.length ? seed.value[0].prefix : undefined;
		}

		if (!begin) {
			const maxId = tapError<{ id: number }[], SqlError>(console.error)(
				search("SELECT MAX(id) as id FROM markov_chain"),
			);
			if (!maxId.ok || !maxId.value[0]?.id) return Ok("12 reais :<");

			const begins = search<MarkovLink>(
				"SELECT prefix FROM markov_chain WHERE id >= ? LIMIT 1",
				Math.floor(Math.random() * maxId.value[0].id) + 1,
			);

			if (!begins.ok || !begins.value.length) {
				return Ok("12 reais ):");
			}

			begin = begins.value[0].prefix;
		}

		const prefix = begin;
		let [p1, p2] = prefix.split(" ");
		const result: string[] = [p1, p2];

		for (let i = 0; i < MAX_GENERATION_LENGTH; i++) {
			const next = tapError<MarkovLink[], SqlError>(console.error)(
				search(
					"SELECT suffix, count FROM markov_chain WHERE prefix = ?",
					`${p1}${p2.length ? (" " + p2) : ""}`,
				),
			);
			if (!next.ok || !next.value.length) break;

			const nextWord = pickWeighted(next.value);
			result.push(nextWord);

			if (/[.!?]$/.test(nextWord) && i > 10) break; // sentence boundary
			if (i > 20 && Math.random() < 0.08) break;
			if (i >= MAX_GENERATION_LENGTH - 1) break;
			if (i > 12 && Math.random() < (6 / 7) ** 9) break;

			p1 = p2, p2 = nextWord;
		}

		const firstUrl = result.findIndex((w) => /https?:\/\/\S+/.test(w));
		return Ok(firstUrl === -1 ? result.join(" ") : result.slice(0, firstUrl + 1).join(" "));
	} catch (e) {
		if (e instanceof Error) console.log(e.stack);
		return Fail(Errors.sql.queryFailed("generate()", String(e)));
	}
}

function pickWeighted(items: MarkovLink[]): string {
	const totalWeight = items.reduce((sum, item) => sum + item.count, 0);
	let random = Math.random() * totalWeight;

	for (const link of items) {
		if (random < link.count) {
			return link.suffix;
		}
		random -= link.count;
	}

	return items[0].suffix;
}
