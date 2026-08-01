/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { greedyString, type Parser } from "@kuristina/commands";
import { type CommandExecutionContext, defineCommand } from "@kuristina/commands/registry";
import { type AsyncResult, mapAsync, mapWithConcurrency, ok } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import { Theme } from "@kuristina/discord-ui";
import { getScrobbleProvider, type ScrobbleProvider } from "@kuristina/services/scrobbling";
import type { AppError } from "@kuristina/errors";

const PROVIDER = "lastfm" as const;
const MAX_SHOWN = 15;
const CONCURRENCY_LIMIT = 5;

interface PlaycountResult {
	discordId: bigint;
	playcount: number;
	ok: boolean;
}

interface RankedResult {
	discordId: bigint;
	playcount: number;
}

async function fetchLinkedAccounts(
	ctx: CommandExecutionContext<Record<PropertyKey, never>, Parser<string>>,
): AsyncResult<Map<bigint, string>, AppError> {
	const guild = await ctx.getGuild();

	if (!guild) return ok(new Map());

	const memberIds = [...guild.members.keys()];
	return repositories.scrobble.getUsernamesForMembers(memberIds, PROVIDER);
}

async function fetchPlaycounts(
	entries: [bigint, string][],
	artist: string,
	provider: ScrobbleProvider,
): Promise<PromiseSettledResult<PlaycountResult>[]> {
	return await mapWithConcurrency(entries, CONCURRENCY_LIMIT, async ([discordId, username]) => {
		const result = await provider.getArtistPlaycount(username, artist);
		return {
			discordId,
			playcount: result.ok ? result.value ?? 0 : 0,
			ok: result.ok,
		};
	});
}

function rankResults(
	settled: PromiseSettledResult<PlaycountResult>[],
	maxShown: number,
): { ranked: RankedResult[]; errors: number } {
	const results = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
	const totalErrors = settled.filter((r) => r.status === "fulfilled" && !r.value.ok).length;

	for (const r of settled) {
		if (r.status === "rejected") {
			console.warn("  · whoknows: request failed:", r.reason);
		}
	}

	const ranked = results
		.filter((r) => r.playcount > 0)
		.sort((a, b) => b.playcount - a.playcount)
		.slice(0, maxShown);

	return {
		ranked,
		errors: totalErrors + settled.filter((r) => r.status === "rejected").length,
	};
}

function NoPlaysMessage({ artist, errors }: { artist: string; errors: number }) {
	const errorSuffix = errors > 0 ? ` (${errors} requests failed)` : "";
	return (
		<message>
			<h3>No plays found</h3>
			<p>
				No one here has scrobbled <strong>{artist}</strong>.{errorSuffix}
			</p>
		</message>
	);
}

function WhoKnows({
	ranked,
	totalLinked,
	errors,
	artist,
}: {
	ranked: RankedResult[];
	totalLinked: number;
	errors: number;
	artist: string;
}) {
	const maxCount = ranked[0]?.playcount ?? 0;

	return (
		<message>
			<h3>Who knows {artist}?</h3>
			<section>
				<p>
					<ul>
						{ranked.map((r, i) => (
							<li>
								{i === 0 ? "👑" : `${i + 1}.`} <strong>{`<@${r.discordId}>`}</strong>
								{" — "}
								<strong>{r.playcount.toLocaleString()}</strong> plays{" "}
								{i === 0 ? "🎉" : r.playcount === maxCount ? "👏" : ""}
							</li>
						))}
					</ul>
				</p>
				<p>
					<sub>
						{ranked.length} of {totalLinked} linked members shown
						{errors > 0 ? ` · ⚠️ ${errors} request${errors > 1 ? "s" : ""} failed` : ""}
						{" · "}
						{PROVIDER}
					</sub>
				</p>
			</section>
		</message>
	);
}

export default defineCommand(["whoknows", "wk"], {
	$: greedyString,
}, async (ctx) => {
	const artist = ctx.remaining?.trim();
	if (!artist) {
		return void await ctx.error(
			`give me an artist name, e.g. \`${Theme.prefix}whoknows Katelyn Bleh\``,
		);
	}

	const hasAccounts = mapAsync(fetchLinkedAccounts(ctx))((result) => {
		if (!result.size) {
			throw new Error("no one has linked an account yet");
		}
		return { linked: result, artist };
	});

	const ranked = mapAsync(hasAccounts)(async ({ linked, artist: artistName }) => {
		const provider = getScrobbleProvider(PROVIDER);
		const entries = [...linked.entries()];
		const settled = await fetchPlaycounts(entries, artistName, provider);
		const { ranked, errors } = rankResults(settled, MAX_SHOWN);

		return { ranked, errors, totalLinked: linked.size, artist: artistName };
	});

	mapAsync(ranked)(async ({ ranked, errors, totalLinked, artist: artistName }) => {
		if (!ranked.length) {
			await ctx.reply(<NoPlaysMessage artist={artistName} errors={errors} />);
			return;
		}

		await ctx.reply(
			<WhoKnows
				ranked={ranked}
				totalLinked={totalLinked}
				errors={errors}
				artist={artistName}
			/>,
		);
	});
}, {
	description:
		"Shows who in this server has scrobbled a given artist the most, ranked by playcount. Requires a linked Last.fm account.",
	category: "lastfm",
	cooldownMs: 5000,
});
