/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { MessageComponentTypes, type RoleSelectComponent } from "@discordeno/types";

export type RoleSelectProps = Omit<RoleSelectComponent, "type">;

export function RoleSelect(props: RoleSelectProps): RoleSelectComponent {
	return {
		type: MessageComponentTypes.RoleSelect,
		...props,
	};
}
