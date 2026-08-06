/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Invocation } from "@kuristina/commands/core";
import { cancelWaiter, waitForInteraction } from "@kuristina/core";
import {
	applyPlan,
	createPlan,
	parseKeyValuePairs,
	recordApplied,
	renderDiffMessage,
	type RowChange,
} from "@kuristina/database/admin";
import { ButtonStyles, type Interaction } from "@kuristina/discord-bot";

export const parseKeyValues = (input: string): Record<string, string> => {
	const result = parseKeyValuePairs(input);
	if (!result.valid) {
		throw new Error(result.message);
	}
	return result.value;
};

export async function confirmAndApply(
	ctx: Invocation,
	changes: RowChange[],
	description: string,
): Promise<void> {
	const plan = createPlan(description, changes);
	const rendered = renderDiffMessage(plan);

	const { customId: confirmId, promise: confirmP } = waitForInteraction<Interaction>(
		"db-confirm",
		60_000,
		{ filter: (i) => i.user?.id === ctx.user.id },
	);
	const { customId: cancelId, promise: cancelP } = waitForInteraction<Interaction>(
		"db-cancel",
		60_000,
		{ filter: (i) => i.user?.id === ctx.user.id },
	);

	const content = rendered.kind === "inline" ? rendered.content : `**${plan.description}**`;
	const files = rendered.kind === "file" ? [rendered] : undefined;

	await ctx.reply({
		content,
		files,
		components: [
			<row>
				<button customId={confirmId} style={ButtonStyles.Primary}>Confirm</button>
				<button customId={cancelId} style={ButtonStyles.Secondary}>Cancel</button>
			</row>,
		],
	});

	const winner = await Promise.race([
		confirmP.then(() => "confirm" as const),
		cancelP.then(() => "cancel" as const),
	]).catch(() => "timeout" as const);

	cancelWaiter(confirmId);
	cancelWaiter(cancelId);

	if (winner !== "confirm") {
		const msg = winner === "cancel"
			? "cancelled, nothing changed"
			: "confirmation timed out, nothing changed";

		await ctx.reply({
			content: msg,
			components: [],
			files: [],
		});
		return;
	}

	const applied = await applyPlan(plan);
	if (!applied.ok) {
		await ctx.reply({
			content: `apply failed: ${applied.error.message}`,
			components: [],
			files: [],
		});
		return;
	}

	recordApplied(plan);
	await ctx.reply({
		content: `applied: ${plan.description} (${plan.changes.length} row change${
			plan.changes.length === 1 ? "" : "s"
		})`,
		components: [],
		files: [],
	});
}
