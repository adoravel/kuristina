/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { gray } from "./colours.ts";
import { levelBadge, type LogLevel } from "./levels.ts";

export interface LogOptions {
	level?: LogLevel;
	prefix?: string;
	timestamp?: boolean;
	icon?: boolean;
}

export function formatLog(
	message: string,
	options: LogOptions = {},
): string {
	const { level = "info", prefix, timestamp = true, icon = true } = options;

	const ts = timestamp ? gray(`[${new Date().toLocaleString()}] `) : "";
	const badge = levelBadge(level, icon);
	const prefixStr = prefix ? `${gray("[")}${prefix}${gray("]")} ` : "";

	return `${ts}${badge} ${prefixStr}${message}`;
}

export function log(
	message: string,
	options: LogOptions = {},
): void {
	const { level = "info" } = options;
	const output = formatLog(message, options);
	if (level === "error") {
		console.error(output);
	} else {
		console.log(output);
	}
}

export function logInfo(message: string, prefix = ""): void {
	log(message, { level: "info", prefix });
}

export function logSuccess(message: string, prefix = ""): void {
	log(message, { level: "success", prefix });
}

export function logWarn(message: string, prefix = ""): void {
	log(message, { level: "warn", prefix });
}

export function logError(message: string, prefix = ""): void {
	log(message, { level: "error", prefix });
}

export function logDebug(message: string, prefix = ""): void {
	log(message, { level: "debug", prefix });
}

export function logWithPrefix(
	prefix: string,
	level: LogLevel = "info",
	message: string,
): void {
	log(message, { level, prefix });
}
