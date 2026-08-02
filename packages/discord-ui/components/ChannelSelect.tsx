/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type ChannelSelectComponent, MessageComponentTypes } from "@discordeno/types";

export type ChannelSelectProps = Omit<ChannelSelectComponent, "type">;

export function ChannelSelect(props: ChannelSelectProps): ChannelSelectComponent {
	return {
		type: MessageComponentTypes.ChannelSelect,
		...props,
	};
}
