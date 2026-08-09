/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { extractMusicUrls, resolveSongLink } from "@kuristina/services/music/links";
import { getMusicMetadata } from "@kuristina/services/music/metadata";
import { renderMusicLinkCard } from "@kuristina/embeds/musiclinks";
import { reconcileCompanions } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import type { MessageCompanion } from "@kuristina/database";

export async function handleMusicLinks(
	bot: typeof discord,
	message: Message,
	ex?: MessageCompanion[],
): Promise<void> {
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
			if (!link.ok) return undefined;

			const metadata = link.value.artist
				? await getMusicMetadata(link.value.artist, link.value.title, link.value.kind ?? "song")
				: undefined;
			return renderMusicLinkCard(link.value, metadata?.ok ? metadata.value : undefined);
		},
		ex,
	);
}
