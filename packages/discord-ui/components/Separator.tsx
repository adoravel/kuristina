/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { MessageComponentTypes, type SeparatorComponent } from "@discordeno/bot";

export type SeparatorProps = Omit<SeparatorComponent, "type">;

export function Separator(props: SeparatorProps): SeparatorComponent {
	return {
		type: MessageComponentTypes.Separator,
		...props,
	};
}
