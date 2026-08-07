/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
	type DiscordMediaGalleryItem,
	type MediaGalleryComponent,
	MessageComponentTypes,
} from "@discordeno/types";
import { childrenToArray } from "../utils.ts";
import { MediaItem } from "./media-item.tsx";

export type MediaGalleryProps = Omit<MediaGalleryComponent, "type" | "items"> & {
	children: MediaGalleryComponent["items"];
};

export function MediaGallery({ children, ...props }: MediaGalleryProps): MediaGalleryComponent {
	return {
		type: MessageComponentTypes.MediaGallery,
		items: childrenToArray(children),
		...props,
	};
}

export interface MediaGalleryItemProps {
	url: string;
	description?: string;
	spoiler?: boolean;
}

export function MediaGalleryItem(
	{ url, description, spoiler }: MediaGalleryItemProps,
): DiscordMediaGalleryItem {
	return {
		media: <MediaItem url={url} />,
		description,
		spoiler,
	};
}
