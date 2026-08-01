/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	bgBlack,
	bgCyan,
	bgGreen,
	bgRed,
	bgYellow,
	bold,
	dim,
	green,
	red,
	yellow,
} from "./colours.ts";

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

export const levelStyles: Record<
	LogLevel,
	{ bg: (s: string) => string; fg: (s: string) => string }
> = {
	debug: { bg: bgBlack, fg: dim },
	info: { bg: bgCyan, fg: bold },
	warn: { bg: bgYellow, fg: yellow },
	error: { bg: bgRed, fg: red },
	success: { bg: bgGreen, fg: green },
};

export const levelIcons: Record<LogLevel, string> = {
	debug: "🐛",
	info: "ℹ",
	warn: "⚠",
	error: "✘",
	success: "✔",
};

export function levelBadge(level: LogLevel, icon = true): string {
	const { bg, fg } = levelStyles[level];
	const label = level.toUpperCase();
	const coloured = bg(fg(` ${label} `));
	return icon ? `${levelIcons[level]} ${coloured}` : coloured;
}
