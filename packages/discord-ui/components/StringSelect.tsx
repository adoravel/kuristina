/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	MessageComponentTypes,
	type SelectOption,
	type StringSelectComponent,
} from "@discordeno/types";
import { childrenToArray } from "../utils.ts";
import type { Flatten } from "@kuristina/core";

export type StringSelectProps = Omit<StringSelectComponent, "type" | "options"> & {
	children: Flatten<StringSelectComponent["options"]> | StringSelectComponent["options"];
};

export function StringSelect(
	{ children, ...props }: StringSelectProps,
): StringSelectComponent {
	return {
		type: MessageComponentTypes.StringSelect,
		options: childrenToArray(children),
		...props,
	};
}

export function StringOption(props: SelectOption) {
	return props;
}
