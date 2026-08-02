/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { config } from "@kuristina/config";
import { extractFediUrls, fetchFediPost, renderFediPost } from "@kuristina/services/fediverse";
import { sendCompanion, suppressOriginalEmbed } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";

export async function handleFediverseLinks(bot: typeof discord, message: Message): Promise<void> {
	if (!config.modules.linkEmbeds.fediverse) return;
	const urls = extractFediUrls(message.content).slice(0, config.modules.linkEmbeds.maxPerMessage);
	if (!urls.length) return;

	let sent = 0;
	for (const url of urls) {
		const post = await fetchFediPost(url);
		if (!post.ok) continue;
		await sendCompanion(bot, message, renderFediPost(post.value), "richlink");
		sent++;
	}
	if (sent) await suppressOriginalEmbed(bot, message);
}
