/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { CreateMessageOptions, EditMessage } from "~/discord/types";
import { MessageComponent, MessageFlags } from "@discordeno/types";
import { childrenToArray } from "./utils.ts";

type MessageOptions = CreateMessageOptions & EditMessage;
export type ComponentMessageProps = MessageOptions & { children: MessageComponent[] };

export function ComponentMessage(
	{ children, flags, ...props }: ComponentMessageProps,
): MessageOptions {
	return {
		flags: MessageFlags.IsComponentV2 | (flags ?? 0),
		components: childrenToArray(children),
		...props,
	};
}
