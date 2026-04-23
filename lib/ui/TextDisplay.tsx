/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { MessageComponentTypes, TextDisplayComponent } from "@discordeno/bot";
import { childrenToString } from "./utils.ts";

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
