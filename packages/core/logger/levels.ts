/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { badges } from "./badge.ts";

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

export const levelIcons: Record<LogLevel, string> = {
	debug: "🐛",
	info: "ℹ",
	warn: "⚠",
	error: "✘",
	success: "✔",
};

export function levelBadge(level: LogLevel, icon: boolean = true): string {
	return icon ? `${levelIcons[level]} ${badges[level]}` : badges[level];
}
