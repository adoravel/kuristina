/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { md, Theme } from "@kuristina/discord-ui";
import { type MusicLinkResult, PLATFORM_LABELS } from "./types.ts";

export function renderPlatformLinks(result: MusicLinkResult): string[] {
	return Object.entries(result.links)
		.map(([platform, url]) =>
			`${Theme.icon("link")} ${
				md.link(`${PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ?? platform} ↗`, url)
			}`
		);
}
