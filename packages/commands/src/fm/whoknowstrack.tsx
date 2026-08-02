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

function NoPlaysMessage(
	{ artist, track }: { artist: string; track: string },
) {
	return (
		<message>
			<h3>No plays found</h3>
			<p>
				No one here has scrobbled <strong>{track}</strong> by <strong>{artist}</strong>.
			</p>
		</message>
	);
}

function WhoKnowsTrack({
	ranked,
	totalLinked,
	track,
}: {
	ranked: RankedResult[];
	totalLinked: number;
	track: { name: string; artist: string; href: string; image: string };
}) {
	const maxCount = ranked[0]?.playcount ?? 0;

	return (
		<message>
			<section>
				<accessory>
					<thumbnail url={track.image} description={track.name} />
				</accessory>
				<h3>
					<icon name="waveform" />
					{`  Top listeners of `}
					<a href={track.href}>{track.name} ↗</a>
				</h3>
				<sub>by {track.artist}</sub>
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

export default defineCommand(["whoknowstrack", "wkt", "wt", "wktrack"], {
	$: greedyString,
}, async (ctx) => {
	const query = ctx.remaining?.trim();
	let artist: string | undefined;
	let track: string | undefined;

	if (query) {
		const parts = query.split("|").map((p) => p.trim()).filter(Boolean);
		if (parts.length === 2) [artist, track] = parts;
	}

	if (!artist || !track) {
		const own = await repositories.scrobble.getDefault(ctx.user.id);
		if (own.ok && own.value) {
			const recent = await getRecentTracks(own.value.username, { limit: 1 });
			const recentTrack = recent.ok ? recent.value.track[0] : undefined;
			if (recentTrack) {
				artist = recentTrack.artist["#text"] ?? recentTrack.artist.name;
				track = recentTrack.name;
			}
		}
	}

	if (!artist || !track) {
		return void await ctx.error(
			`give me an artist and track, e.g. \`${Theme.prefix}whoknowstrack Radiohead | Karma Police\``,
		);
	}

	const provider = getScrobbleProvider(PROVIDER);

	const trackInfo = await mapAsync(provider.track.getInfo(artist, track, false))((info) => ({
		name: info.name,
		artist: info.artist,
		image: info.imageUrl,
		href: info.href,
	}));

	if (!trackInfo.ok) {
		return void await ctx.error("track not found");
	}

	const { value: resolvedTrack } = trackInfo;

	const hasAccounts = mapAsync(fetchLinkedAccounts(ctx))((result) => {
		if (!result || result.size === 0) {
			throw new Error("no one has linked an account yet");
		}
		return { linked: result };
	});

	const ranked = mapAsync(hasAccounts)(async ({ linked }) => {
		const entries = [...linked.entries()];
		const settled = await fetchPlaycounts(
			entries,
			(username) => provider.track.getInfo(artist!, track!, true, username),
		);
		return rankResults(settled, MAX_SHOWN);
	});

	await ctx.resolve(
		mapAsync(ranked)(async ({ ranked, imageUrl }) => {
			if (!ranked.length) {
				await ctx.reply(
					<NoPlaysMessage artist={resolvedTrack.artist} track={resolvedTrack.name} />,
				);
				return;
			}
			if (imageUrl && imageUrl !== resolvedTrack.image) resolvedTrack.image = imageUrl;
			await ctx.reply(
				<WhoKnowsTrack
					ranked={ranked}
					totalLinked={ranked.length}
					track={resolvedTrack}
				/>,
			);
		}),
	);
}, {
	description:
		"Shows who in this server has scrobbled a given track the most. Use `artist | track`, or omit to use your last played track. Requires a linked Last.fm account.",
	category: "lastfm",
	cooldownMs: 5000,
});
