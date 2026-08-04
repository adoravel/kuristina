/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, mapWithConcurrency, ok } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import type { AppError } from "@kuristina/errors";

export const PROVIDER = "last.fm" as const;
export const MAX_SHOWN = 15;
export const CONCURRENCY_LIMIT = 5;

export interface RankedResult {
	discordId: bigint;
	playcount: number;
	imageUrl: string;
}

interface HasScrobbleData {
	individualUserScrobbles: number;
	imageUrl: string;
}

export function parseMusicQuery(query?: string): [string | undefined, string | undefined] {
	if (!query) return [undefined, undefined];

	let bestIndex = -1;
	let maxScore = -1;

	for (let i = 0; i < query.length; i++) {
		const char = query[i];

		if (char === "-" || char === "|") {
			let currentScore = 0;
			const hasLeftSpace = i > 0 && query[i - 1] === " ";
			const hasRightSpace = i < query.length - 1 && query[i + 1] === " ";

			if (hasLeftSpace && hasRightSpace) {
				currentScore = 3;
			} else if (hasLeftSpace || hasRightSpace) {
				currentScore = 2;
			} else {
				currentScore = 1;
			}

			if (currentScore >= maxScore) {
				maxScore = currentScore;
				bestIndex = i;
			}
		}
	}

	if (bestIndex === -1) {
		const cleanQuery = query.trim();
		return cleanQuery ? [undefined, cleanQuery] : [undefined, undefined];
	}

	const artist = query.substring(0, bestIndex).trim() || undefined;
	const work = query.substring(bestIndex + 1).trim() || undefined;

	return [artist, work];
}

export async function fetchLinkedAccounts(
	guildId: bigint,
): AsyncResult<Map<bigint, string> | undefined, AppError> {
	if (!guildId) return ok(undefined);
	return await repositories.scrobble.getAllForProviderInGuild(PROVIDER, guildId);
}

export async function fetchPlaycounts<T extends HasScrobbleData>(
	entries: [bigint, string][],
	fetch: (username: string) => AsyncResult<T, unknown>,
): Promise<PromiseSettledResult<{ discordId: bigint; data?: T }>[]> {
	return await mapWithConcurrency(entries, CONCURRENCY_LIMIT, async ([discordId, username]) => {
		const result = await fetch(username);
		return { discordId, data: result.ok ? result.value : undefined };
	});
}

export function rankResults<T extends HasScrobbleData>(
	settled: PromiseSettledResult<{ discordId: bigint; data?: T }>[],
	maxShown: number,
): { ranked: RankedResult[]; errors: number; imageUrl?: string } {
	const results = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
	const errors = results.filter((r) => !r.data).length +
		settled.filter((r) => r.status === "rejected").length;

	for (const r of settled) {
		if (r.status === "rejected") {
			logger.boo("whoknows: request failed: " + r.reason);
		}
	}

	const ranked = results
		.filter((r): r is { discordId: bigint; data: T } =>
			!!r.data && r.data.individualUserScrobbles > 0
		)
		.sort((a, b) => b.data.individualUserScrobbles - a.data.individualUserScrobbles)
		.slice(0, maxShown);

	return {
		ranked: ranked.map(($) => ({
			discordId: $.discordId,
			imageUrl: $.data.imageUrl,
			playcount: $.data.individualUserScrobbles,
		})),
		errors,
		imageUrl: ranked.findLast((x) => x.data?.imageUrl)?.data?.imageUrl,
	};
}
