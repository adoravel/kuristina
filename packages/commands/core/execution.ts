/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { dim, red, yellow } from "@kuristina/core";
import type { Invocation } from "./invocation.tsx";
import { cooldownOrchestrator, type Middleware, PENDING_COOLDOWN } from "./middleware.ts";
import { italic } from "@std/fmt/colors";

export interface ExecutionContext {
	invocation: Invocation;
	path: string[];
	start: number;
	badge: string;
}

function formatArgs(args: Record<string, unknown>): string {
	const entries = Object.entries(args).filter(([, v]) => v !== undefined && v !== null);
	if (!entries.length) return "";

	const formatted = entries.map(([k, v]) => {
		let value = v;
		if (typeof v === "string" && v.length > 50) {
			value = v.slice(0, 47) + "...";
		}
		if (typeof v === "bigint") {
			value = `${v.toString()}n`;
		}
		if (Array.isArray(v) && v.length > 5) {
			value = `[${v.slice(0, 5).join(", ")}… +${v.length - 5} more]`;
		}
		return `${k}=${JSON.stringify(value)}`;
	});

	return ` ${dim("(")}${dim(formatted.join(dim(", ")))}${dim(")")}`;
}

function formatUser(invocation: Invocation): string {
	const user = invocation.user;
	if (!user?.id) return "unknown";

	const name = user.globalName || user.username || "<unknown>";
	return `${name} (@${user.username ?? "<unknown>"}) [${user.id}]`;
}

function formatPath(path: string[]): string {
	return path.join(" ");
}

function formatTiming(name: string, time: number, threshold: number = 1): string {
	if (time > 50 * threshold) return `${name}: ${yellow(time.toFixed(0))}ms`;
	else if (time > 250 * threshold) return `${name}: ${red(time.toFixed(0))}ms`;
	else return `${name}: ${dim(time.toFixed(0))}ms`;
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

	const fullPath = formatPath(path);
	const userTag = formatUser(invocation);
	const argsStr = formatArgs(invocation.args);

	const ok = await runMiddlewares(middlewares, invocation);
	if (!ok) return;

	const parseEnd = performance.now();
	const parseTime = parseEnd - start;
	const parseTiming = formatTiming("parse", parseTime);
	try {
		logger.prefixed(
			badge,
			`${dim(fullPath)}${argsStr} executed by ${dim(userTag)} ${dim(italic(parseTiming))}`,
		);

		const execStart = performance.now();
		await exec();
		const execTime = performance.now() - execStart;
		const execTiming = formatTiming("exec", execTime, 2);

		logger.prefixed(
			badge,
			`${dim(fullPath)}${argsStr} executed by ${dim(userTag)} ${dim(italic(execTiming))}`,
		);
		commitCooldown(invocation);
	} catch (error) {
		const execTime = performance.now() - parseEnd;
		const execTiming = formatTiming("exec", execTime, 2);

		logger.prefixed(
			badge,
			`${red(fullPath)}${argsStr} errored for ${dim(userTag)} ${
				dim(italic(`${parseTiming} ${execTiming}`))
			}`,
		);
		logger.boo(`execution error (${fullPath}):`, error);
		throw error;
	}
}
