import { CreateMessageOptions, EditMessage } from "discord/types";
import { childrenToArray } from "./utils.ts";
import { MessageComponent, MessageFlags } from "@discordeno/types";

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
