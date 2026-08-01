/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { MessageComponentTypes, type ThumbnailComponent } from "@discordeno/types";

export type ThumbnailProps = Omit<ThumbnailComponent, "type" | "media"> & { url: string };

export function Thumbnail({ url, ...props }: ThumbnailProps): ThumbnailComponent {
	return {
		type: MessageComponentTypes.Thumbnail,
		media: { url },
		...props,
	};
}
