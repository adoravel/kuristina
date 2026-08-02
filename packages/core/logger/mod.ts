/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { log } from "./format.ts";
import type { LogLevel } from "./levels.ts";

export * from "./colours.ts";
export * from "./badge.ts";
export * from "./levels.ts";
export * from "./progress.ts";
export * from "./tree.ts";
export * from "./header.ts";
export * from "./format.ts";

interface Logger {
	info(message: string, prefix?: string): void;
	yay(message: string, prefix?: string): void;
	warn(message: string, prefix?: string): void;
	boo(message: string, prefix?: string): void;
	debug(message: string, prefix?: string): void;
	prefixed(prefix: string, message?: string, level?: LogLevel): void;
}

declare global {
	var logger: Logger;
}

globalThis.logger = {
	info(message: string, prefix = ""): void {
		log(message, { level: "info", prefix });
	},
	yay(message: string, prefix = ""): void {
		log(message, { level: "success", prefix });
	},
	warn(message: string, prefix = ""): void {
		log(message, { level: "warn", prefix });
	},
	boo(message: string, prefix = ""): void {
		log(message, { level: "error", prefix });
	},
	debug(message: string, prefix = ""): void {
		log(message, { level: "debug", prefix });
	},
	prefixed(
		prefix: string,
		message: string = "",
		level: LogLevel = "info",
	): void {
		log(message, { level, prefix });
	},
};
