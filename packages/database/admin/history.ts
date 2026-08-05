/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { MutationPlan } from "./plan.ts";

const MAX_HISTORY = 20;
const history: MutationPlan[] = [];

export function recordApplied(plan: MutationPlan): void {
	history.push(plan);
	if (history.length > MAX_HISTORY) history.shift();
}

export function popLast(): MutationPlan | undefined {
	return history.pop();
}

export function peekHistory(): readonly MutationPlan[] {
	return history;
}
