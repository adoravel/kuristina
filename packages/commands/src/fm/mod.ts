/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand, user } from "@kuristina/commands/core";
import nowplaying from "./nowplaying.tsx";
import { login, logout, status } from "./login.tsx";
import { update } from "./update.ts";
import alias from "./alias/mod.tsx";

export default defineCommand({
	aliases: ["fm", "lastfm"],
	description: "Last.fm authentication commands",
	category: "fm",
	subcommands: [nowplaying, login, logout, status, update, alias],
	args: {
		query: user({
			description: "user mention or ID (for text mode only)",
			required: false,
			surfaces: ["text"],
		}),
	},
	async exec(ctx) {
		if (ctx.surface === "text") {
			await nowplaying.exec({ ...ctx, args: { user: ctx.args.query } });
			return;
		}
		await ctx.error("use `fm now`, `fm login`, `fm logout`, or `fm status`.");
	},
});
