/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { dim } from "@kuristina/core";
import type { Invocation } from "./invocation.tsx";
import { cooldownOrchestrator, type Middleware, PENDING_COOLDOWN } from "./middleware.ts";
import { italic } from "@std/fmt/colors";

export interface ExecutionContext {
	invocation: Invocation;
	path: string[];
	start: number;
	badge: string;
}

export function commitCooldown(invocation: Invocation): void {
	const pending = (invocation as any)[PENDING_COOLDOWN];
	if (pending) {
		cooldownOrchestrator.set(pending.userId, pending.commandKey, pending.ms);
	}
}

export async function runMiddlewares(
	middlewares: Middleware[],
	invocation: Invocation,
): Promise<boolean> {
	for (const mid of middlewares) {
		const result = await mid.execute(invocation);
		if (result.type !== "continue") {
			return false;
		}
	}
	return true;
}

export async function wrapExecution(
	ctx: ExecutionContext,
	middlewares: Middleware[],
	exec: () => Promise<void>,
): Promise<void> {
	const { invocation, path, start, badge } = ctx;

	const userTag = invocation.user?.id
		? `${invocation.user.globalName ?? ""} (@${
			invocation.user.username ?? "<unknown>"
		}) [${invocation.user.id}]`
		: "unknown";
	const fullPath = path.join(" ");

	const ok = await runMiddlewares(middlewares, invocation);
	if (!ok) return;

	const parseEnd = performance.now();

	try {
		const execStart = performance.now();
		await exec();
		const execTime = performance.now() - execStart;
		const parseTime = parseEnd - start;

		logger.prefixed(
			badge,
			`${dim(fullPath)} executed by ${dim(userTag)} ` +
				dim(italic(`(parse: ${parseTime.toFixed(0)}ms, exec: ${execTime.toFixed(0)}ms)`)),
		);

		commitCooldown(invocation);
	} catch (error) {
		logger.prefixed(
			badge,
			`${fullPath} errored for ${dim(userTag)}: ${error instanceof Error ? error.message : error}`,
		);
		logger.boo(`execution error (${fullPath}):`, error);
		throw error;
	}
}
