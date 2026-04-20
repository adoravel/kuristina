import { ActionRow as Row, MessageComponentTypes } from "@discordeno/types";
import { childrenToArray } from "./utils.ts";

export type ActionRowProps = Omit<Row, "type" | "components"> & {
	children: Row["components"] | Row["components"][];
};

export function ActionRow(
	{ children, ...props }: ActionRowProps,
): Row {
	return {
		type: MessageComponentTypes.ActionRow,
		components: childrenToArray(children),
		...props,
	};
}
