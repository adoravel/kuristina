/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import { extractBskyUrls, fetchBsky } from "@kuristina/services/social/fx";
import { renderBskyPost } from "@kuristina/embeds/bluesky";
import { reconcileCompanions } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import type { MessageCompanion } from "@kuristina/database";

export async function handleBlueskyLinks(
	bot: typeof discord,
	message: Message,
	ex?: MessageCompanion[],
): Promise<void> {
	if (!config.modules.linkEmbeds.bluesky) return;

	const urls = extractBskyUrls(message.content);
	if (!urls.length) return;

	await reconcileCompanions(
		bot,
		message,
		"richlink:bluesky",
		urls.slice(0, config.modules.linkEmbeds.maxPerMessage),
		(url) => url,
		async (url) => {
			const tweet = await fetchBsky(url);
			return tweet.ok ? renderBskyPost(tweet.value) : undefined;
		},
		ex,
	);
}
