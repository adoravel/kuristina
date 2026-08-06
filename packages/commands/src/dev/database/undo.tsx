/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand, ownerOnly } from "@kuristina/commands/core";
import { invertPlan, peekLastPlan, popLastPlan, type RowChange } from "@kuristina/database/admin";
import { confirmAndApply } from "./shared.tsx";

export default defineCommand({
	aliases: "undo",
	description: "Reverts the last applied change (in-memory history, lost on restart).",
	async exec(ctx) {
		const plan = peekLastPlan();
		if (!plan) return void await ctx.error("nothing in history to undo");

		try {
			await confirmAndApply(
				ctx,
				invertPlan(plan).changes as RowChange[],
				`undo: ${plan.description}`,
			);
			popLastPlan();
		} catch (error: any) {
			ctx.error("message" in error ? error.message : String(error));
		}
	},
	middleware: [ownerOnly],
});
