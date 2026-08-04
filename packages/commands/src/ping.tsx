/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { computeSnowflakeTimestamp, defineCommand } from "@kuristina/commands/core";

export default defineCommand({
	aliases: "ping",
	description: "Checks the bot's latency.",
	async exec(ctx) {
		const sent = await ctx.reply({ content: "Pong! 🏓" });
		if (!sent) return;
		const latency = computeSnowflakeTimestamp(sent.id) - ctx.invokedAt;
		await ctx.reply({ content: `Pong! 🏓\n-# ${latency}ms` });
	},
});
