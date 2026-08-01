/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	type ButtonComponent,
	MessageComponentTypes,
	type SectionComponent,
	type TextDisplayComponent,
	type ThumbnailComponent,
} from "@discordeno/types";
import { childrenToArray } from "../utils.ts";

export interface SectionProps {
	children: TextDisplayComponent[];
	accessory: ThumbnailComponent | ButtonComponent;
}

export function Section({ children, ...props }: SectionProps): SectionComponent {
	return {
		type: MessageComponentTypes.Section,
		components: childrenToArray(children),
		...props,
	};
}
