/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { greedyString } from "@kuristina/commands";
import { defineCommand } from "@kuristina/commands/registry";
import { mapAsync, tapErrorAsync } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import { Theme } from "@kuristina/discord-ui";
import { describe } from "@kuristina/errors";
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
	{ artist, album }: { artist: string; album: string },
) {
	return (
		<message>
			<h3>No plays found</h3>
			<p>
				No one here has scrobbled <strong>{album} ↗</strong> by <strong>{artist} ↗</strong>.
			</p>
		</message>
	);
}

function WhoKnowsAlbum({
	ranked,
	totalLinked,
	album,
}: {
	ranked: RankedResult[];
	totalLinked: number;
	album: { name: string; artist: string; href: string; image: string };
}) {
	const maxCount = ranked[0]?.playcount ?? 0;

	return (
		<message>
			<section>
				<accessory>
					<thumbnail url={album.image} description={album.name} />
				</accessory>
				<h3>
					<icon name="disc" />
					{`  Top listeners of `}
					<a href={album.href}>{album.name} ↗</a>
				</h3>
				<sub>by {album.artist}</sub>
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

export default defineCommand(["whoknowsalbum", "wka", "wkalbum"], {
	$: greedyString,
}, async (ctx) => {
	const query = ctx.remaining?.trim();
	let artist: string | undefined;
	let album: string | undefined;

	if (query) {
		const parts = query.split("|").map((p) => p.trim()).filter(Boolean);
		if (parts.length === 2) [artist, album] = parts;
	}

	if (!artist || !album) {
		const own = await repositories.scrobble.getDefault(ctx.user.id);
		if (own.ok && own.value) {
			const recent = await getRecentTracks(own.value.username, { limit: 1 });
			const track = recent.ok ? recent.value.track[0] : undefined;
			if (track?.album?.["#text"]) {
				artist = track.artist["#text"] ?? track.artist.name;
				album = track.album["#text"];
			}
		}
	}

	if (!artist || !album) {
		return void await ctx.error(
			`give me an artist and album, e.g. \`${Theme.prefix}whoknowsalbum Radiohead | OK Computer\``,
		);
	}

	const provider = getScrobbleProvider(PROVIDER);

	const albumInfo = await mapAsync(provider.album.getInfo(artist, album, false))((info) => ({
		name: info.name,
		artist: info.artist,
		image: info.imageUrl,
		href: info.href,
	}));

	if (!albumInfo.ok) {
		return void await ctx.error("album not found");
	}

	const { value: resolvedAlbum } = albumInfo;

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
			(username) => provider.album.getInfo(artist!, album!, true, username),
		);
		return rankResults(settled, MAX_SHOWN);
	});

	const result = mapAsync(ranked)(async ({ ranked, imageUrl }) => {
		if (!ranked.length) {
			await ctx.reply(
				<NoPlaysMessage artist={resolvedAlbum.artist} album={resolvedAlbum.name} />,
			);
			return;
		}
		if (imageUrl && imageUrl !== resolvedAlbum.image) resolvedAlbum.image = imageUrl;
		await ctx.reply(
			<WhoKnowsAlbum
				ranked={ranked}
				totalLinked={ranked.length}
				album={resolvedAlbum}
			/>,
		);
	});

	await tapErrorAsync(result)(async (error) => void await ctx.error(describe(error)));
}, {
	description:
		"Shows who in this server has scrobbled a given album the most. Use `artist | album`, or omit to use your last played album. Requires a linked Last.fm account.",
	category: "lastfm",
	cooldownMs: 5000,
});
