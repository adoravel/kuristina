/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { search, sql, transaction } from "~/database/mod.ts";
import { Fail, Ok, type Result } from "~/lib/result.ts";
import { Errors } from "~/lib/errors.ts";
import { SqlError } from "~/database/errors.ts";

const MAX_GENERATION_LENGTH = 128;

export interface MarkovLink {
	prefix: string;
	suffix: string;
	count: number;
}

function sanitize(text: string): string {
	return text
		.replace(/https?:\/\/[^\s]+/g, "") // url nuh uh
		.replace(/`{1,3}[\s\S]*?`{1,3}/g, "") // Remove code blocks
		.trim();
}

function tokenize(text: string): string[] {
	return text.split(/\s+/).filter(Boolean);
}

export function learn(text: string): Result<void, SqlError> {
	const clean = sanitize(text);
	const tokens = tokenize(clean);

	if (tokens.length < 2) return Ok(undefined);

	const chain: MarkovLink[] = [];
	for (let i = 0; i < tokens.length - 2; i++) {
		chain.push({
			prefix: `${tokens[i]} ${tokens[i + 1]}`,
			suffix: tokens[i + 2],
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

export function bulkLearn(messages: string[]): Result<void, SqlError> {
	const tallies = new Map<string, number>();

	for (const msg of messages) {
		const clean = sanitize(msg);
		const tokens = tokenize(clean);

		if (tokens.length < 3) continue;

		for (let i = 0; i < tokens.length - 2; i++) {
			const prefix = `${tokens[i]} ${tokens[i + 1]}`;
			const suffix = tokens[i + 2];
			const key = `${prefix}|${suffix}`;

			tallies.set(key, (tallies.get(key) || 0) + 1);
		}
	}

	return Ok(transaction(() => {
		for (const [combined, count] of tallies) {
			const [prefix, suffix] = combined.split("|");
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
	}));
}

export function generate(): Result<string, SqlError> {
	try {
		const maxId = search<{ id: number }>("SELECT MAX(id) as id FROM markov_chain");
		if (!maxId.ok || !maxId.value[0]?.id) {
			if (!maxId.ok) console.error(maxId.error);
			return Ok("12 reais i got nothing on me twin");
		}

		const begin = search<MarkovLink>(
			"SELECT prefix FROM markov_chain WHERE id >= ? LIMIT 1",
			Math.floor(Math.random() * maxId.value[0].id) + 1,
		);

		if (!begin.ok || !begin.value.length) {
			if (!begin.ok) console.error(begin.error);
			return Ok("12 reais i got nothing on me twin");
		}

		const prefix = begin.value[0].prefix;
		let [p1, p2] = prefix.split(" ");
		const result: string[] = [p1, p2];

		for (let i = 0; i < MAX_GENERATION_LENGTH; i++) {
			const next = search<MarkovLink>(
				"SELECT suffix, count FROM markov_chain WHERE prefix = ?",
				`${p1} ${p2}`,
			);
			if (!next.ok || next.value.length === 0) {
				if (!next.ok) console.error(next.error);
				break;
			}

			const nextWord = pickWeighted(next.value);
			result.push(nextWord);

			if (/[.!?]$/.test(nextWord) && i > 6) break;
			if (i > 12 && Math.random() < (6 / 7) ** 9) break;

			p1 = p2, p2 = nextWord;
		}

		return Ok(result.join(" "));
	} catch (e) {
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
