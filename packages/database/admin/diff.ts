/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { MutationPlan } from "./plan.ts";

const DISCORD_CODEBLOCK_SAFE_LIMIT = 1800;

export function renderDiff(plan: MutationPlan): string {
	const lines: string[] = [];
	for (const change of plan.changes) {
		lines.push(`--- ${change.table} ${JSON.stringify(change.pk)}`);
		if (change.before === null) {
			for (const [k, v] of Object.entries(change.after!)) {
				lines.push(`+ ${k}: ${JSON.stringify(v)}`);
			}
		} else if (change.after === null) {
			for (const [k, v] of Object.entries(change.before)) {
				lines.push(`- ${k}: ${JSON.stringify(v)}`);
			}
		} else {
			const keys = new Set([...Object.keys(change.before), ...Object.keys(change.after)]);
			for (const k of keys) {
				const a = change.before[k], b = change.after[k];
				if (JSON.stringify(a) !== JSON.stringify(b)) {
					lines.push(`- ${k}: ${JSON.stringify(a)}`);
					lines.push(`+ ${k}: ${JSON.stringify(b)}`);
				}
			}
		}
		lines.push("");
	}
	return lines.join("\n").trimEnd();
}

export function renderDiffMessage(
	plan: MutationPlan,
): { content: string } | { blob: Blob; name: string } {
	const diff = renderDiff(plan);
	if (diff.length <= DISCORD_CODEBLOCK_SAFE_LIMIT) {
		return { content: "```diff\n" + diff + "\n```" };
	}
	return {
		blob: new Blob([diff], { type: "text/plain;charset=utf-8" }),
		name: `${plan.id}.diff`,
	};
}
