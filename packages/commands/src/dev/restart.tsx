/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { defineCommand, ownerOnly } from "@kuristina/commands/registry";
import { requestRestart } from "@kuristina/discord-bot/restart";
import { sleep } from "@kuristina/core";

export default defineCommand(["restart", ">_<"], {}, async (ctx) => {
	const reply = await ctx.reply({
		content: "okiie hold on[ᅟ](https://klipy.com/gifs/entrosar-resenhar)",
	});
	await sleep(2_500);
	await requestRestart(reply.channelId, reply.id);
}, {
	description: "Restarts the bot without pulling.",
	category: "dev",
	middleware: [ownerOnly],
});
