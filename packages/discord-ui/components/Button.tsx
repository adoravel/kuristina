/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type ButtonComponent, MessageComponentTypes } from "@discordeno/types";
import { childrenToString } from "../utils.ts";

type Button = Omit<ButtonComponent, "type" | "label">;

export type ButtonProps = Button & { children?: any };

export function Button({ children, ...props }: ButtonProps): ButtonComponent {
	return {
		type: MessageComponentTypes.Button,
		label: childrenToString("Button", children) ?? undefined,
		...props,
	};
}
