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
	extractParagraphs,
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
		bio?: string;
		href: string;
		tags?: { name: string }[];
		imageUrl: string;
	};
}) {
	const maxCount = ranked[0]?.playcount ?? 0;
	const tags = artist.tags?.slice(0, 5)?.map(($) => `#${$.name}`)?.join("  ");

	return (
		<message>
			<section>
				<accessory>
					<thumbnail url={artist.imageUrl} description={artist.name} />
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
								{(i === 0 || r.playcount === maxCount)
									? <icon name="crown" />
									: <icon name="empty" />}
								{` <@${r.discordId}>`} — <strong>{r.playcount.toLocaleString()}</strong> plays
							</li>
						))}
					</ol>
				</blockquote>
			</section>
			<hr spacing={2} />
			{artist.bio ? <sub>{extractParagraphs(artist.bio, 1, artist.href)}</sub> : (
				<sub>
					{ranked.length} of {totalLinked} linked members shown
					{" · "}
					{PROVIDER}
				</sub>
			)}
		</message>
	);
}

export default defineCommand({
	aliases: ["artist", "whoknows", "wk", "w", "musician", "band"],
	description:
		"Shows who in this server has scrobbled a given artist the most, ranked by playcount. Requires a linked Last.fm account.",
	category: "fm",
	args: {
		global: arg.boolean({
			description: "whether this ranking won't be scoped to the current server",
			required: false,
		}),
		query: arg.string({
			description: "artist name",
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
			return { ...info, name: info.name || query };
		});

		if (!artistInfo.ok) {
			return void await ctx.error("Artist not found.");
		}

		const { value: artist } = artistInfo;

		if (artist.name.toLowerCase() !== query.toLowerCase()) {
			await repositories.artistAliases.link(query, artist.name, "autocorrect");
		}
		const group = await repositories.artistAliases.getGroup(artist.name);
		const names = group.ok ? group.value : [artist.name];

		const linked = ctx.args.global || !ctx.guildId
			? await repositories.scrobble.getAllForProvider(PROVIDER)
			: await fetchLinkedAccounts(ctx.guildId);

		if (!linked.ok || !linked.value?.size) {
			return void await ctx.error("No one has linked an account yet.");
		}

		const entries = [...linked.value.entries()];
		const settled = await fetchPlaycounts(entries, async (username) => {
			const perAlias = await Promise.all(
				names.map((n) => provider.artist.getInfo(n, true, username)),
			);
			const ok_ = perAlias.filter((r) => r.ok);
			if (!ok_.length) return perAlias[0];
			const summed = ok_.reduce((sum, r) => sum + r.value.individualUserScrobbles, 0);
			return { ok: true, value: { ...ok_[0].value, individualUserScrobbles: summed } };
		});

		const { ranked, imageUrl } = rankResults(settled, MAX_SHOWN);

		if (!ranked.length) {
			await ctx.reply(<NoPlaysMessage artist={artist.name} />);
			return;
		}

		if (imageUrl && imageUrl !== artist.imageUrl) artist.imageUrl = imageUrl;

		await ctx.reply(
			<WhoKnows
				ranked={ranked}
				totalLinked={linked.value.size}
				artist={artist}
			/>,
		);
	},
});
