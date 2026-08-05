/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand, ownerOnly } from "@kuristina/commands/core";
import { invertPlan, popLast } from "@kuristina/database/admin";
import { confirmAndApply } from "./shared.tsx";

export default defineCommand({
	aliases: "undo",
	description: "Reverts the last applied change (in-memory history, lost on restart).",
	async exec(ctx) {
		const last = popLast();
		if (!last) return void await ctx.error("nothing in history to undo");
		await confirmAndApply(ctx, invertPlan(last));
	},
	middleware: [ownerOnly],
});
