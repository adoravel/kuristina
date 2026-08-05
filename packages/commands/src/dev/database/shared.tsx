/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Invocation } from "@kuristina/commands/core";
import { cancelWaiter, waitForInteraction } from "@kuristina/core";
import {
	applyPlan,
	type MutationPlan,
	recordApplied,
	renderDiffMessage,
} from "@kuristina/database/admin";
import { ButtonStyles, type Interaction } from "@kuristina/discord-bot";

export const MAX_PLAN_ROWS = Number.MAX_SAFE_INTEGER;

export function parseKeyValuePairs(input: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const pair of input.split(",")) {
		const eq = pair.indexOf("=");
		if (eq === -1) continue;
		out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
	}
	return out;
}

export function coerceTypes(
	reference: Record<string, unknown>,
	changes: Record<string, string>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(changes)) {
		const existing = reference[k];
		if (typeof existing === "number") out[k] = Number(v);
		else if (typeof existing === "bigint") out[k] = BigInt(v);
		else out[k] = v;
	}
	return out;
}

export async function confirmAndApply(ctx: Invocation, plan: MutationPlan): Promise<void> {
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

	await ctx.reply({
		content: "content" in rendered ? rendered.content : `**${plan.description}**`,
		...("blob" in rendered ? { files: [rendered] } : {}),
		components: [
			<row>
				<button customId={confirmId} style={ButtonStyles.Danger}>Confirm</button>
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
		await ctx.reply({
			content: winner === "cancel"
				? "cancelled, nothing changed"
				: "confirmation timed out, nothing changed",
		});
		return;
	}

	const applied = await applyPlan(plan);
	if (!applied.ok) return void await ctx.error(`apply failed: ${applied.error.message}`);

	recordApplied(plan);
	await ctx.success(
		`applied: ${plan.description} (${plan.changes.length} row change${
			plan.changes.length === 1 ? "" : "s"
		})`,
	);
}
