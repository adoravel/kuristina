/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand, ownerOnly } from "@kuristina/commands/core";
import { invertPlan, peekLastPlan, popLastPlan } from "@kuristina/database/admin";
import { confirmAndApply, reportCommandError } from "./shared.tsx";

export default defineCommand({
	aliases: "undo",
	description: "Reverts the last applied change (in-memory history, lost on restart).",
	async exec(ctx) {
		const plan = peekLastPlan();
		if (!plan) return void await ctx.error("nothing in history to undo");

		try {
			const undone = await confirmAndApply(ctx, invertPlan(plan));
			if (undone) popLastPlan();
		} catch (e) {
			await reportCommandError(ctx, e);
		}
	},
	middleware: [ownerOnly],
});
