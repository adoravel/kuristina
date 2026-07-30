/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type ActionRow as Row, MessageComponentTypes } from "@discordeno/types";
import { childrenToArray } from "../utils.ts";

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
