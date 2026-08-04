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
	PROVIDER,
	type RankedResult,
	rankResults,
} from "./helper.ts";

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
					<a href={artist.href}>{artist.name}</a>
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

export default defineCommand({
	aliases: ["whoknows", "wk", "w", "artist", "musician", "band"],
	description:
		"Shows who in this server has scrobbled a given artist the most, ranked by playcount. Requires a linked Last.fm account.",
	category: "fm",
	args: {
		query: arg.string({
			description: "artist name",
			required: false,
			greedy: true,
		}),
	},
	async exec(ctx) {
		let query = ctx.args.query?.trim();

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

		if (!ctx.guildId) {
			return void await ctx.error("This command can only be used in a server.");
		}

		const linked = await fetchLinkedAccounts(ctx.guildId);
		if (!linked.ok || !linked.value?.size) {
			return void await ctx.error("No one has linked an account yet.");
		}

		const entries = [...linked.value.entries()];
		const settled = await fetchPlaycounts(
			entries,
			(username) => provider.artist.getInfo(query, true, username),
		);

		const { ranked, imageUrl } = rankResults(settled, MAX_SHOWN);

		if (!ranked.length) {
			await ctx.reply(<NoPlaysMessage artist={artist.name} />);
			return;
		}

		if (imageUrl && imageUrl !== artist.image) artist.image = imageUrl;

		await ctx.reply(
			<WhoKnows
				ranked={ranked}
				totalLinked={linked.value.size}
				artist={artist}
			/>,
		);
	},
});
