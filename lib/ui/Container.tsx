/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ContainerComponent, MessageComponentTypes } from "@discordeno/types";
import { childrenToArray } from "./utils.ts";

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
