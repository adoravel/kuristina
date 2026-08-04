/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
	type ChannelSelectComponent,
	type MentionableSelectComponent,
	MessageComponentTypes,
	type RoleSelectComponent,
	type SelectMenuDefaultValue,
	type UserSelectComponent,
} from "@discordeno/types";
import { childrenToArray } from "../utils.ts";
import type { Flatten } from "@kuristina/core";

export type EntitySelectType = "user" | "role" | "channel" | "mentionable";

type ComponentTypeMap = {
	user: UserSelectComponent;
	role: RoleSelectComponent;
	channel: ChannelSelectComponent;
	mentionable: MentionableSelectComponent;
};

const componentTypeConstant: Record<EntitySelectType, MessageComponentTypes> = {
	user: MessageComponentTypes.UserSelect,
	role: MessageComponentTypes.RoleSelect,
	channel: MessageComponentTypes.ChannelSelect,
	mentionable: MessageComponentTypes.MentionableSelect,
};

export type EntityDefaultProps = SelectMenuDefaultValue;

export function EntityDefault({ id, type }: EntityDefaultProps): SelectMenuDefaultValue {
	return { id, type };
}

export type EntitySelectProps<T extends EntitySelectType> =
	& Omit<ComponentTypeMap[T], "type" | "default_values">
	& {
		selectType: T;
		children?: Flatten<EntityDefaultProps> | EntityDefaultProps[];
	};

export function EntitySelect<T extends EntitySelectType>(
	props: EntitySelectProps<T>,
): ComponentTypeMap[T] {
	const { selectType, children, ...rest } = props;
	const defaultValues = childrenToArray(children).filter(Boolean) as SelectMenuDefaultValue[];

	return {
		type: componentTypeConstant[selectType],
		default_values: defaultValues.length ? defaultValues : undefined,
		...rest,
	} as any as ComponentTypeMap[T];
}

export function UserSelect(
	props: Omit<EntitySelectProps<"user">, "selectType">,
): UserSelectComponent {
	return EntitySelect({ selectType: "user", ...props });
}

export function RoleSelect(
	props: Omit<EntitySelectProps<"role">, "selectType">,
): RoleSelectComponent {
	return EntitySelect({ selectType: "role", ...props });
}

export function ChannelSelect(
	props: Omit<EntitySelectProps<"channel">, "selectType">,
): ChannelSelectComponent {
	return EntitySelect({ selectType: "channel", ...props });
}

export function MentionableSelect(
	props: Omit<EntitySelectProps<"mentionable">, "selectType">,
): MentionableSelectComponent {
	return EntitySelect({ selectType: "mentionable", ...props });
}
