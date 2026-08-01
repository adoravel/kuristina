/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { bold, gray } from "./colours.ts";

export function divider(width = 60): string {
	return gray("─".repeat(Math.max(width, 1)));
}

export function header(title: string, subtitle = "", width = 60): string {
	const parts = [bold(title)];
	if (subtitle) {
		parts.push(" " + gray("(" + subtitle + ")"));
	}
	return parts.join("") + "\n" + divider(width);
}
