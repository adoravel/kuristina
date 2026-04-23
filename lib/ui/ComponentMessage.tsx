/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
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
