/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SqlError } from "./errors.ts";
import type { Result } from "@kuristina/core";

export interface PurgeOutcome {
	task: string;
	deleted: number;
}

type PurgeTask = () => Promise<Result<number, SqlError>>;

const tasks = new Map<string, PurgeTask>();

export function registerPurgeTask(name: string, task: PurgeTask): void {
	tasks.set(name, task);
}

export async function runMaintenance(): Promise<PurgeOutcome[]> {
	const outcomes: PurgeOutcome[] = [];
	for (const [name, task] of tasks) {
		const result = await task();
		if (!result.ok) {
			logger.boo(` maintenance: "${name}" failed: ` + result.error);
			continue;
		}
		outcomes.push({ task: name, deleted: result.value });
		if (result.value > 0) logger.yay(`maintenance: "${name}" purged ${result.value} rows`);
	}
	return outcomes;
}
