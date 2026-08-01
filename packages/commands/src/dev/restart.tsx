/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { defineCommand, ownerOnly } from "@kuristina/commands/registry";
import { requestRestart } from "@kuristina/discord-bot/restart";

export default defineCommand(["restart"], {}, async (ctx) => {
	const reply = await ctx.reply({
		content: "oki hold on[ᅟ](https://klipy.com/gifs/entrosar-resenhar)",
	});
	await requestRestart(reply.channelId, reply.id);
}, {
	description: "Restarts the bot without pulling.",
	category: "dev",
	middleware: [ownerOnly],
});
