/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { extractMusicUrls, resolveSongLink } from "@kuristina/services/musiclinks";
import { renderMusicLinkCard } from "@kuristina/embeds/musiclinks";
import { reconcileCompanions } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";

export async function handleMusicLinks(bot: typeof discord, message: Message): Promise<void> {
	const urls = extractMusicUrls(message.content).slice(0, 2);
	if (!urls.length) return;

	await reconcileCompanions(
		bot,
		message,
		"richlink:musiclinks",
		urls,
		(url) => url,
		async (url) => {
			const link = await resolveSongLink(url);
			return link.ok ? renderMusicLinkCard(link.value) : undefined;
		},
	);
}
