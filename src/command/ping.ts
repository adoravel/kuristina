/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand } from "~/lib/command/registry.tsx";

export default defineCommand("ping", {}, async (ctx) => {
	const sent = await ctx.reply({ content: `Pong! 🏓` });

	await ctx.reply({
		content: `Pong! 🏓\n-# ${sent.timestamp - ctx.message.timestamp}ms`,
	});
});
