/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import { extractStatusUrls, fetchTweet } from "@kuristina/services/twitter";
import { renderTweet } from "@kuristina/embeds/twitter";
import { reconcileCompanions } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import type { MessageCompanion } from "@kuristina/database";

export async function handleTwitterLinks(
	bot: typeof discord,
	message: Message,
	ex?: MessageCompanion[],
): Promise<void> {
	if (!config.modules.linkEmbeds.twitter) return;
	if (!message.content.includes("x.com") && !message.content.includes("twitter.com")) return;

	const urls = extractStatusUrls(message.content).slice(0, config.modules.linkEmbeds.maxPerMessage);
	if (!urls.length) return;

	await reconcileCompanions(
		bot,
		message,
		"richlink:twitter",
		urls,
		(url) => url,
		async (url) => {
			const tweet = await fetchTweet(url);
			return tweet.ok ? renderTweet(tweet.value) : undefined;
		},
		ex,
	);
}
