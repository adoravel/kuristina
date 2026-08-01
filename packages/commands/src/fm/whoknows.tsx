/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { greedyString, type Parser } from "@kuristina/commands";
import { type CommandExecutionContext, defineCommand } from "@kuristina/commands/registry";
import { type AsyncResult, mapAsync, mapWithConcurrency, ok, tapErrorAsync } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import { Theme } from "@kuristina/discord-ui";
import { type AppError, describe } from "@kuristina/errors";
import { getArtistInfo } from "@kuristina/services/lastfm";
import {
	type ExtendedScrobleArtist,
	getScrobbleProvider,
	type ScrobbleProvider,
} from "@kuristina/services/scrobbling";

const PROVIDER = "lastfm" as const;
const MAX_SHOWN = 15;
const CONCURRENCY_LIMIT = 5;

interface PlaycountResult {
	discordId: bigint;
	data?: ExtendedScrobleArtist;
}

interface RankedResult {
	discordId: bigint;
	playcount: number;
	imageUrl: string;
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
	provider: ScrobbleProvider,
	entries: [bigint, string][],
	artist: string,
): Promise<PromiseSettledResult<PlaycountResult>[]> {
	return await mapWithConcurrency(entries, CONCURRENCY_LIMIT, async ([discordId, username]) => {
		const result = await provider.artist.getArtistInfo(artist, true, username);
		return {
			discordId,
			data: result.ok ? result.value : undefined,
		};
	});
}

function rankResults(
	settled: PromiseSettledResult<PlaycountResult>[],
	maxShown: number,
): { ranked: RankedResult[]; errors: number; imageUrl?: string } {
	const results = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
	const errors = settled.filter((r) => r.status === "fulfilled" && !r.value.data).length;

	for (const r of settled) {
		if (r.status === "rejected") {
			console.warn("  · whoknows: request failed:", r.reason);
		}
	}

	const ranked = results
		.filter((r) => r.data && r.data.individualUserScrobbles > 0)
		.sort((a, b) => b.data!.individualUserScrobbles - a.data!.individualUserScrobbles)
		.slice(0, maxShown);

	return {
		ranked: ranked.map(($) => ({
			discordId: $.discordId,
			imageUrl: $.data!.imageUrl,
			playcount: $.data!.individualUserScrobbles,
		})),
		errors: errors + settled.filter((r) => r.status === "rejected").length,
		imageUrl: ranked.findLast((x) => x.data?.imageUrl)?.data?.imageUrl,
	};
}

function NoPlaysMessage({ artist, errors }: { artist: string; errors: number }) {
	return (
		<message>
			<h3>No plays found</h3>
			<p>
				No one here has scrobbled <strong>{artist}</strong>.
				{errors > 0 && (
					<>
						<br />
						<br />
						<sub>${errors} requests failed</sub>
					</>
				)}
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
	artist: {
		name: string;
		tags?: string[];
		image: string;
	};
}) {
	const maxCount = ranked[0]?.playcount ?? 0;

	const tags = artist?.tags?.length
		? artist.tags.slice(0, 4).map((tag) => `#${tag}`).join("  ")
		: null;

	return (
		<message allowedMentions={{ parse: [], repliedUser: false }}>
			<section>
				<accessory>
					<thumbnail url={artist.image} description={artist.name} />
				</accessory>
				<h2>
					<icon name="artist" />
					{`  Top listeners of ${artist.name}`}
				</h2>
				{tags && <sub>{tags}</sub>}
				<blockquote>
					<ol>
						{ranked.map((r, i) => (
							<li>
								<br />
								{(i === 0 || r.playcount === maxCount) && <icon name="crown" />}
								{` <@${r.discordId}>`} — <strong>{r.playcount.toLocaleString()}</strong> plays
							</li>
						))}
					</ol>
				</blockquote>
			</section>
			<hr spacing={2} />
			<sub>
				{ranked.length} of {totalLinked} linked members shown
				{errors > 0 ? ` · ⚠️ ${errors} request${errors > 1 ? "s" : ""} failed` : ""}
				{" · "}
				{PROVIDER}
			</sub>
		</message>
	);
}

export default defineCommand(["whoknows", "wk"], {
	$: greedyString,
}, async (ctx) => {
	const query = ctx.remaining?.trim();
	if (!query) {
		return void await ctx.error(
			`give me an artist name, e.g. \`${Theme.prefix}whoknows Katelyn Bleh\``,
		);
	}

	const artistInfo = await mapAsync(getArtistInfo(query, undefined, true))((info) => {
		const name = info.name || query;
		const tags = info.tags?.tag?.slice(0, 5).map((t) => t.name);
		return { name, tags, image: info.highestQualityImage["#text"] };
	});

	if (!artistInfo.ok) {
		return void await ctx.error("artist not found");
	}

	const { value: artist } = artistInfo;

	const hasAccounts = mapAsync(fetchLinkedAccounts(ctx))((result) => {
		if (!result.size) {
			throw new Error("no one has linked an account yet");
		}
		return { linked: result, artist: query };
	});

	const ranked = mapAsync(hasAccounts)(async ({ linked }) => {
		const entries = [...linked.entries()];

		const provider = getScrobbleProvider(PROVIDER);
		const settled = await fetchPlaycounts(provider, entries, artist.name);

		return rankResults(settled, MAX_SHOWN);
	});

	const result = mapAsync(ranked)(async ({ ranked, errors, imageUrl }) => {
		if (!ranked.length) {
			await ctx.reply(<NoPlaysMessage artist={artist.name} errors={errors} />);
			return;
		}
		if (imageUrl && imageUrl !== artist.image) artist.image = imageUrl;
		await ctx.reply(
			<WhoKnows
				ranked={ranked}
				totalLinked={ranked.length}
				errors={errors}
				artist={artist}
			/>,
		);
	});

	await tapErrorAsync(result)(async (error) => void await ctx.error(describe(error)));
}, {
	description:
		"Shows who in this server has scrobbled a given artist the most, ranked by playcount. Requires a linked Last.fm account.",
	category: "lastfm",
	cooldownMs: 5000,
});
