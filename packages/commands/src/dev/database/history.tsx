/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand, ownerOnly } from "@kuristina/commands/core";
import { getHistory } from "@kuristina/database/admin";

export default defineCommand({
	aliases: "history",
	description: "Shows recently applied changes this session.",
	async exec(ctx) {
		const entries = getHistory();
		if (!entries.length) {
			return void await ctx.reply({ content: "no changes applied this session" });
		}
		await ctx.reply({
			content: entries.map((p, i) =>
				`${i + 1}. ${p.description} (${p.changes.length} row${
					p.changes.length === 1 ? "" : "s"
				}) @ ${new Date(p.createdAt).toLocaleTimeString()}`
			).join("\n"),
		});
	},
	middleware: [ownerOnly],
});
