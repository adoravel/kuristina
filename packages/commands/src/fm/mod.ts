/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand, memberId } from "@kuristina/commands/registry";
import nowplaying from "./nowplaying.tsx";
import { login, logout, status } from "./login.tsx";
import { optional } from "@kuristina/commands";

export default defineCommand("fm", { $: optional(memberId) }, async (ctx) => {
	await nowplaying.exec(ctx);
}, {
	description:
		"Last.fm commands. Use `fm login`, `fm logout`, `fm status` or just `fm` for now playing.",
	category: "lastfm",
	cooldownMs: 3000,
	subcommands: [login, logout, status],
});
