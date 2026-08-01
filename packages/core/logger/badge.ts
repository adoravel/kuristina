/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { bgBlack, bgCyan, bgGreen, bgMagenta, bgRed, bgYellow, bold } from "./colours.ts";

export interface BadgeOptions {
	label: string;
	icon?: string;
	bg: (s: string) => string;
	fg?: (s: string) => string;
}

export function badge({ label, icon, bg, fg = bold }: BadgeOptions): string {
	const coloured = bg(fg(` ${label} `));
	return icon ? `${icon} ${coloured}` : coloured;
}

export const badges = {
	fetch: (icon = "⬇") => badge({ label: "FETCH", bg: bgCyan, icon }),
	warn: (icon = "⚠") => badge({ label: "WARN", bg: bgYellow, icon }),
	build: (icon = "🔨") => badge({ label: "BUILD", bg: bgMagenta, icon }),
	success: (icon = "✔") => badge({ label: "SUCCESS", bg: bgGreen, icon }),
	error: (icon = "✘") => badge({ label: "ERROR", bg: bgRed, icon }),
	info: (icon = "ℹ") => badge({ label: "INFO", bg: bgBlack, icon }),
	debug: (icon = "🐛") => badge({ label: "DEBUG", bg: bgBlack, icon }),
};

export type BadgeName = keyof typeof badges;
