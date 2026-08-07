/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
	MessageComponentTypes,
	type SelectOption,
	type StringSelectComponent,
} from "@discordeno/types";
import { childrenToArray, childrenToString } from "../utils.ts";
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

export type StringOptionProps = Omit<SelectOption, "label"> & { children?: unknown };

export function StringOption({
	children,
	value,
	description,
	emoji,
	default: isDefault,
}: StringOptionProps): SelectOption {
	const label = childrenToString("option", children) ?? "Unknown";

	const option: SelectOption = {
		label: label.slice(0, 100),
		value: value.slice(0, 100),
	};

	if (description) {
		option.description = description.slice(0, 100);
	}

	if (emoji) {
		option.emoji = emoji;
	}

	if (isDefault !== undefined) {
		option.default = isDefault;
	}

	return option;
}
