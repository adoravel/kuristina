/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { repositories } from "@kuristina/database";
import { ok, type Result } from "@kuristina/core";
import type { SqlError } from "@kuristina/database";
import { config } from "@kuristina/config";
import { TimedMap } from "@kuristina/core";

import { buildChain, generateSentence, sanitise, shouldLearn, tokenize } from "./core.ts";

export interface MarkovLink {
	prefix: string;
	suffix: string;
	count: number;
}

const { markov } = repositories;
const linkCache = new TimedMap<string, MarkovLink[]>(30_000);

export async function learn(text: string): Promise<Result<void, SqlError>> {
	if (!shouldLearn(text)) return ok(undefined);

	const tokens = tokenize(sanitise(text));
	if (tokens.length === 1) {
		return await markov.learnWord(tokens[0]);
	}

	const chain = buildChain(tokens);
	if (!chain.length) return ok(undefined);

	const entries = chain.map(({ prefix, suffix }) => ({ prefix, suffix, count: 1 }));
	return await markov.bulkLearnChain(entries);
}

export async function bulkLearn(messages: string[]): Promise<Result<void, SqlError>> {
	const tallies = new Map<string, Map<string, number>>();
	for (const msg of messages) {
		if (!shouldLearn(msg)) continue;
		const tokens = tokenize(sanitise(msg));
		const chain = buildChain(tokens);
		for (const { prefix, suffix } of chain) {
			const inner = tallies.get(prefix) ?? new Map();
			inner.set(suffix, (inner.get(suffix) ?? 0) + 1);
			tallies.set(prefix, inner);
		}
	}

	const entries = [];
	for (const [prefix, suffixes] of tallies) {
		for (const [suffix, count] of suffixes) {
			entries.push({ prefix, suffix, count });
		}
	}
	return await markov.bulkLearnChain(entries);
}

export async function sampleWord(): Promise<Result<string, SqlError>> {
	return await markov.sampleWord();
}

export async function generate(
	bias?: string,
): Promise<Result<string, SqlError>> {
	const maxLength = config.modules.markov.maxGenerationLength;
	const repo = markov;

	let seedPrefix: string | undefined;

	if (bias) {
		const word = bias.trim();
		const result = await repo.findRandomSeedContaining(word);
		if (result.ok && result.value.length) {
			seedPrefix = result.value[0].prefix;
		}
	}

	if (!seedPrefix) {
		const maxIdRes = await repo.maxChainId();
		if (!maxIdRes.ok) return maxIdRes;
		if (maxIdRes.value === null) {
			return ok("no data available");
		}
		const randomId = Math.floor(Math.random() * maxIdRes.value) + 1;
		const rows = await repo.findChainFromId(randomId);
		if (!rows.ok) return rows;
		if (!rows.value.length) return ok("no data available");
		seedPrefix = rows.value[0].prefix;
	}

	const getLinks = async (prefix: string): Promise<MarkovLink[]> => {
		const cached = linkCache.get(prefix);
		if (cached) return cached;
		const res = await repo.findLinksByPrefix(prefix);
		const value = res.ok ? res.value : [];
		linkCache.set(prefix, value);
		return value;
	};

	const sentence = await generateSentence(seedPrefix, getLinks, maxLength);
	return ok(sentence);
}
