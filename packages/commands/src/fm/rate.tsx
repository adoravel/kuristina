/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand } from "@kuristina/commands/core";
import { repositories } from "@kuristina/database";
import { getScrobbleProvider } from "@kuristina/services/music/scrobbling";
import { PROVIDER, resolveArtistAndTrack } from "./helper.ts";

function makeLoveCommand(action: "love" | "unlove") {
	const aliases = action === "love" ? ["love", "would", "mrgghh"] : ["unlove", "unrate", "fuck"];
	const description = action === "love"
		? "Loves a track on Last.fm."
		: "Un-loves a track on Last.fm.";

	return defineCommand({
		aliases,
		description,
		category: "lastfm",
		cooldownMs: 3000,
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
			const sessionKey = await ctx.resolve(
				repositories.scrobble.getSessionKey(ctx.user.id, PROVIDER),
			);
			if (sessionKey === undefined) return;
			if (!sessionKey) {
				return void await ctx.error(
					"Your Last.fm link doesn't have write access yet. Run `fm login` again to grant it, then retry this.",
				);
			}

			const { artist, track } = await resolveArtistAndTrack(ctx);
			if (!artist || !track) {
				return void await ctx.error(
					"Couldn't figure out which track. Give me `artist | track`, or make sure you have recent scrobbles.",
				);
			}

			const provider = getScrobbleProvider(PROVIDER);
			const fn = action === "love" ? provider.track.love : provider.track.unrate;
			if (!fn) return void await ctx.error(`${PROVIDER} doesn't support this`);

			const result = await fn(sessionKey, artist, track);
			if (!result.ok) return void await ctx.resolve(result);

			await ctx.success(
				`${action === "love" ? "Loved" : "Un-loved"} **${track}** by **${artist}**`,
			);
		},
	});
}

export const love = makeLoveCommand("love");
export const unrate = makeLoveCommand("unlove");
