/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { bold, gray } from "./colours.ts";

export interface TreeItem {
	key: string;
	value: string;
	color?: (s: string) => string;
}

const BRANCH_MID = "├── ";
const BRANCH_LAST = "└── ";

export function formatTree(items: TreeItem[]): string {
	return items.map((item, i) => {
		const branch = i === items.length - 1 ? BRANCH_LAST : BRANCH_MID;
		const color = item.color ?? bold;
		return ` ${gray(branch)}${item.key}: ${color(item.value)}`;
	}).join("\n");
}
