/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { MessageComponentTypes, type TextDisplayComponent } from "@discordeno/bot";
import { childrenToString } from "../utils.ts";

export interface TextDisplayProps {
	children: any;
	id?: number;
}

export function TextDisplay(
	{ children, id }: TextDisplayProps,
): TextDisplayComponent {
	children = childrenToString("TextDisplay", children)!;
	if (!children) {
		throw new Error("TextDisplay requires at least one child");
	}

	return {
		type: MessageComponentTypes.TextDisplay,
		content: children,
		id,
	};
}
