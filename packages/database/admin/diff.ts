/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { MutationPlan } from "./types.ts";
import { MAX_DIFF_LENGTH } from "./constants.ts";

const formatValue = (v: unknown): string => {
	if (v === null) return "null";
	if (typeof v === "string") return JSON.stringify(v);
	if (typeof v === "bigint") return `${v}n`;
	if (Array.isArray(v)) return JSON.stringify(v);
	if (typeof v === "object") return JSON.stringify(v);
	return String(v);
};

const formatChange = (change: MutationPlan["changes"][number]): string[] => {
	const lines: string[] = [];
	const pk = Object.entries(change.pk).map(([k, v]) => `${k}=${formatValue(v)}`).join(" ");

	if (change.before === null) {
		lines.push(`--- ${change.table} ${pk} (insert)`);
		for (const [k, v] of Object.entries(change.after!)) {
			lines.push(`+ ${k}: ${formatValue(v)}`);
		}
	} else if (change.after === null) {
		lines.push(`--- ${change.table} ${pk} (delete)`);
		for (const [k, v] of Object.entries(change.before)) {
			lines.push(`- ${k}: ${formatValue(v)}`);
		}
	} else {
		lines.push(`--- ${change.table} ${pk} (update)`);
		const keys = new Set([...Object.keys(change.before), ...Object.keys(change.after)]);
		for (const k of keys) {
			const a = change.before[k];
			const b = change.after[k];
			if (JSON.stringify(a) !== JSON.stringify(b)) {
				lines.push(`- ${k}: ${formatValue(a)}`);
				lines.push(`+ ${k}: ${formatValue(b)}`);
			}
		}
	}
	return lines;
};

export const renderDiff = (plan: MutationPlan): string => {
	const lines: string[] = [];
	for (const change of plan.changes) {
		lines.push(...formatChange(change));
		lines.push("");
	}
	return lines.join("\n").trimEnd();
};

export const renderDiffMessage = (plan: MutationPlan):
	| { kind: "inline"; content: string }
	| { kind: "file"; blob: Blob; name: string } => {
	const diff = renderDiff(plan);
	if (diff.length <= MAX_DIFF_LENGTH) {
		return { kind: "inline", content: "```diff\n" + diff + "\n```" };
	}
	return {
		kind: "file",
		blob: new Blob([diff], { type: "text/plain;charset=utf-8" }),
		name: `${plan.id}.diff`,
	};
};
