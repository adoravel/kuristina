/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { MessageComponentTypes, SeparatorComponent } from "@discordeno/bot";

export type SeparatorProps = Omit<SeparatorComponent, "type">;

export function Separator(props: SeparatorProps): SeparatorComponent {
	return {
		type: MessageComponentTypes.Separator,
		...props,
	};
}
