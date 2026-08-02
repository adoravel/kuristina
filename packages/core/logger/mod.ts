/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
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

const formatArgs = (args: unknown[]): string =>
	args
		.map((arg) => {
			if (typeof arg === "string") return arg;

			if (arg instanceof Error) {
				return arg.stack ?? arg.message ?? String(arg);
			}

			if (typeof arg === "object" && arg !== null) {
				if (typeof Deno !== "undefined" && typeof Deno.inspect === "function") {
					try {
						return Deno.inspect(arg, { colors: true, depth: 4 });
					} catch { /* no-op */ }
				}

				try {
					return JSON.stringify(arg, null, 4);
				} catch {
					const name = arg.constructor?.name || "Object";
					const fallbackMsg = "message" in arg ? String((arg as any).message) : "";
					const fallbackStatus = "status" in arg ? `(Status: ${(arg as any).status}) ` : "";

					if (fallbackMsg || fallbackStatus) {
						return `[${name}] ${fallbackStatus}${fallbackMsg}`.trim();
					}
					return `[Unserializable ${name}]`;
				}
			}

			return String(arg);
		})
		.join(" ");

export interface ScopedLogger {
	info(...args: unknown[]): void;
	yay(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	boo(...args: unknown[]): void;
	debug(...args: unknown[]): void;
}

export interface Logger extends ScopedLogger {
	prefixed(prefix: string, message: string, level?: LogLevel | null): void;
}

declare global {
	var logger: Logger;
}

const createScopedLogger = (prefix = ""): ScopedLogger => ({
	info: (...args) => log(formatArgs(args), { level: "info", prefix }),
	yay: (...args) => log(formatArgs(args), { level: "success", prefix }),
	warn: (...args) => log(formatArgs(args), { level: "warn", prefix }),
	boo: (...args) => log(formatArgs(args), { level: "error", prefix }),
	debug: (...args) => log(formatArgs(args), { level: "debug", prefix }),
});

globalThis.logger = {
	...createScopedLogger(""),

	prefixed(prefix: string, message: string, level: LogLevel | null = null): any {
		log(message, { level, prefix });
	},
};
