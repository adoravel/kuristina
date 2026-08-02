/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { greedyString } from "@kuristina/commands";
import { defineCommand } from "@kuristina/commands/registry";
import { mapAsync } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import { Theme } from "@kuristina/discord-ui";
import { getScrobbleProvider } from "@kuristina/services/scrobbling";
import { getRecentTracks } from "@kuristina/services/lastfm";
import {
	fetchLinkedAccounts,
	fetchPlaycounts,
	MAX_SHOWN,
	PROVIDER,
	type RankedResult,
	rankResults,
} from "./whoknows-shared.ts";

function NoPlaysMessage({ artist }: { artist: string }) {
	return (
		<message>
			<h3>No plays found</h3>
			<p>
				No one here has scrobbled <strong>{artist}</strong>.
			</p>
		</message>
	);
}

function WhoKnows({
	ranked,
	totalLinked,
	artist,
}: {
	ranked: RankedResult[];
	totalLinked: number;
	artist: {
		name: string;
		href: string;
		tags?: string[];
		image: string;
	};
}) {
	const maxCount = ranked[0]?.playcount ?? 0;

	const tags = artist?.tags?.length
		? artist.tags.slice(0, 4).map((tag) => `#${tag}`).join("  ")
		: null;

	return (
		<message>
			<section>
				<accessory>
					<thumbnail url={artist.image} description={artist.name} />
				</accessory>
				<h3>
					<icon name="artist" />
					{`  Top listeners of `}
					<a href={artist.href}>{artist.name} ↗</a>
				</h3>
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
				{" · "}
				{PROVIDER}
			</sub>
		</message>
	);
}

export default defineCommand(["whoknows", "wk"], {
	$: greedyString,
}, async (ctx) => {
	let query = ctx.remaining?.trim();

	if (!query) {
		const own = await repositories.scrobble.getDefault(ctx.user.id);
		if (own.ok && own.value) {
			const recent = await getRecentTracks(own.value.username, { limit: 1 });
			if (recent.ok && recent.value.track[0]) {
				query = recent.value.track[0].artist["#text"] ?? recent.value.track[0].name;
			}
		}
	}
	if (!query) {
		return void await ctx.error(
			`Give me an artist name, e.g. \`${Theme.prefix}whoknows Katelyn Bleh\``,
		);
	}

	const provider = getScrobbleProvider(PROVIDER);

	const artistInfo = await mapAsync(provider.artist.getInfo(query, false))((info) => {
		const name = info.name || query;
		const tags = info.tags?.slice(0, 5).map((t) => t.name);
		return { name, tags, image: info.imageUrl, href: info.href };
	});

	if (!artistInfo.ok) {
		return void await ctx.error("Artist not found");
	}

	const { value: artist } = artistInfo;

	const hasAccounts = mapAsync(fetchLinkedAccounts(ctx))((result) => {
		if (!result || result.size === 0) {
			throw new Error("no one has linked an account yet");
		}
		return { linked: result, artist: query };
	});

	const ranked = mapAsync(hasAccounts)(async ({ linked }) => {
		const entries = [...linked.entries()];
		const settled = await fetchPlaycounts(
			entries,
			(username) => provider.artist.getInfo(query!, true, username),
		);

		return rankResults(settled, MAX_SHOWN);
	});

	await ctx.resolve(
		mapAsync(ranked)(async ({ ranked, imageUrl }) => {
			if (!ranked.length) {
				await ctx.reply(<NoPlaysMessage artist={artist.name} />);
				return;
			}
			if (imageUrl && imageUrl !== artist.image) artist.image = imageUrl;
			await ctx.reply(
				<WhoKnows
					ranked={ranked}
					totalLinked={ranked.length}
					artist={artist}
				/>,
			);
		}),
	);
}, {
	description:
		"Shows who in this server has scrobbled a given artist the most, ranked by playcount. Requires a linked Last.fm account.",
	category: "fm",
	cooldownMs: 5000,
});
