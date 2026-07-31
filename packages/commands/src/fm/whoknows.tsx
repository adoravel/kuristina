/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { defineCommand } from "@kuristina/commands/registry";
import { greedyString } from "@kuristina/commands";
import { repositories } from "@kuristina/database";
import { getScrobbleProvider } from "@kuristina/services/scrobbling";
import { mapWithConcurrency } from "@kuristina/core";
import { Theme } from "@kuristina/discord-ui";

const PROVIDER = "lastfm" as const;
const MAX_SHOWN = 15;

export default defineCommand(["whoknows", "wk"], {
	$: greedyString,
}, async (ctx) => {
	const artist = ctx.remaining?.trim();
	if (!artist) {
		return void await ctx.error(
			`give me an artist name, e.g. \`${Theme.prefix}whoknows Katelyn Bleh\``,
		);
	}

	const guild = await ctx.getGuild();
	if (!guild) return void await ctx.error("guild context is uninitialised");

	const memberIds = [...guild.members.keys()];
	const linked = await repositories.scrobble.getUsernamesForMembers(memberIds, PROVIDER);
	if (!linked.ok) {
		return void await ctx.error("failed to look up linked accounts, try again in a moment");
	}

	if (!linked.value.size) {
		return void await ctx.reply(
			<message>
				<h3>No one's linked yet</h3>
				<p>Nobody in this server has linked a Last.fm account yet.</p>
			</message>,
		);
	}

	const provider = getScrobbleProvider(PROVIDER);
	const entries = [...linked.value.entries()];

	const settled = await mapWithConcurrency(entries, 5, async ([discordId, username]) => {
		const result = await provider.getArtistPlaycount(username, artist);
		return { discordId, playcount: result.ok ? result.value ?? 0 : 0, ok: result.ok };
	});

	const results = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
	const totalErrors = settled.filter((r) => r.status === "fulfilled" && !r.value.ok).length;

	for (const r of settled) {
		if (r.status === "rejected") console.warn("  · whoknows: request failed:", r.reason);
	}

	const ranked = results
		.filter((r) => r.playcount > 0)
		.sort((a, b) => b.playcount - a.playcount)
		.slice(0, MAX_SHOWN);

	if (!ranked.length) {
		const errorSuffix = totalErrors > 0 ? ` (${totalErrors} requests failed)` : "";
		return void await ctx.reply(
			<message>
				<h3>No plays found</h3>
				<p>
					No one here has scrobbled <strong>{artist}</strong>.{errorSuffix}
				</p>
			</message>,
		);
	}

	const maxCount = ranked[0].playcount;

	await ctx.reply(
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
						{ranked.length} of {linked.value.size} linked members shown
						{totalErrors > 0
							? ` · ⚠️ ${totalErrors} request${totalErrors > 1 ? "s" : ""} failed`
							: ""}
						{" · "}
						{PROVIDER}
					</sub>
				</p>
			</section>
		</message>,
	);
}, {
	description:
		"Shows who in this server has scrobbled a given artist the most, ranked by playcount. Requires a linked Last.fm account.",
	category: "lastfm",
	cooldownMs: 5000,
});
