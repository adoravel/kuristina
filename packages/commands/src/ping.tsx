/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { defineCommand } from "@kuristina/commands/registry";

export default defineCommand("ping", {}, async (ctx) => {
	const sent = await ctx.reply({ content: `Pong! 🏓` });

	await ctx.reply({
		content: `Pong! 🏓\n-# ${sent.timestamp - ctx.message.timestamp}ms`,
	});
});
