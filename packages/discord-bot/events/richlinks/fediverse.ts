/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import { extractFediUrls, fetchFediPost } from "@kuristina/services/fediverse";
import { renderFediPost } from "@kuristina/embeds/fediverse";
import { reconcileCompanions } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import type { MessageCompanion } from "@kuristina/database";

export async function handleFediverseLinks(
	bot: typeof discord,
	message: Message,
	ex?: MessageCompanion[],
): Promise<void> {
	if (!config.modules.linkEmbeds.fediverse) return;

	const urls = extractFediUrls(message.content).slice(0, config.modules.linkEmbeds.maxPerMessage);
	if (!urls.length) return;

	await reconcileCompanions(
		bot,
		message,
		"richlink:fediverse",
		urls,
		(url) => url,
		async (url) => {
			const post = await fetchFediPost(url);
			return post.ok ? renderFediPost(post.value) : undefined;
		},
		ex,
	);
}
