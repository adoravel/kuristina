/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand } from "@kuristina/commands/core";
import { mapAsync } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import { Theme } from "@kuristina/discord-ui";
import { getScrobbleProvider } from "@kuristina/services/scrobbling";
import { getRecentTracks } from "@kuristina/services/lastfm";
import {
	fetchLinkedAccounts,
	fetchPlaycounts,
	MAX_SHOWN,
	parseMusicQuery,
	PROVIDER,
	type RankedResult,
	rankResults,
} from "./helper.ts";

function NoPlaysMessage({ artist, track }: { artist: string; track: string }) {
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
					<a href={track.href}>{track.name}</a>
				</h3>
				<sub>
					by <a href={`https://last.fm/music/${track.artist}`}>{track.artist}</a>
				</sub>
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

export default defineCommand({
	aliases: ["whoknowstrack", "wkt", "wt", "wktrack", "track", "song"],
	description:
		"Shows who in this server has scrobbled a given track the most. Use `artist | track`, or omit to use your last played track. Requires a linked Last.fm account.",
	category: "lastfm",
	args: {
		query: arg.string({
			description: "artist | track",
			required: false,
			greedy: true,
			surfaces: ["text"],
		}),
		artist: arg.string({
			description: "artist name",
			required: false,
			surfaces: ["slash"],
		}),
		track: arg.string({
			description: "track name",
			required: false,
			surfaces: ["slash"],
		}),
	},
	async exec(ctx) {
		const query = ctx.args.query?.trim();

		let artist: string | undefined = ctx.args.artist, track: string | undefined = ctx.args.track;
		if (ctx.args.query) {
			[artist, track] = parseMusicQuery(query);
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

		if (!ctx.guildId) {
			return void await ctx.error("This command can only be used in a server.");
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

		const linked = await fetchLinkedAccounts(ctx.guildId);
		if (!linked.ok || !linked.value?.size) {
			return void await ctx.error("No one has linked an account yet.");
		}

		const entries = [...linked.value.entries()];
		const settled = await fetchPlaycounts(
			entries,
			(username) => provider.track.getInfo(artist!, track!, true, username),
		);

		const { ranked, imageUrl } = rankResults(settled, MAX_SHOWN);

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
				totalLinked={linked.value.size}
				track={resolvedTrack}
			/>,
		);
	},
});
