/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type ContainerComponent, MessageComponentTypes } from "@discordeno/types";
import { childrenToArray } from "../utils.ts";

export type ContainerProps = Omit<ContainerComponent, "type" | "components"> & {
	children: ContainerComponent["components"];
};

export function Container({ children, ...props }: ContainerProps): ContainerComponent {
	return {
		type: MessageComponentTypes.Container,
		components: childrenToArray(children),
		...props,
	};
}
