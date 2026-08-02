/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { config } from "@kuristina/config";
import { extractStatusUrls, fetchTweet, renderTweet } from "@kuristina/services/twitter";
import { sendCompanion, suppressOriginalEmbed } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";

export async function handleTwitterLinks(bot: typeof discord, message: Message): Promise<void> {
	if (!config.modules.linkEmbeds.twitter) return;
	const urls = extractStatusUrls(message.content).slice(0, config.modules.linkEmbeds.maxPerMessage);
	if (!urls.length) return;

	let sent = 0;
	for (const url of urls) {
		const tweet = await fetchTweet(url);
		if (!tweet.ok) continue;
		await sendCompanion(bot, message, renderTweet(tweet.value), "richlink:twitter");
		sent++;
	}
	if (sent) await suppressOriginalEmbed(bot, message);
}
