/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand } from "@kuristina/commands/core";
import { ownerOnly } from "@kuristina/commands/core";
import { requestRestart } from "@kuristina/discord-bot/restart";

export default defineCommand({
	aliases: ["restart", "rst"],
	description: "Restarts the bot without pulling.",
	middleware: [ownerOnly],
	async exec(ctx) {
		await requestRestart(ctx, "okiie hold on[ᅟ](https://klipy.com/gifs/entrosar-resenhar)");
	},
});
