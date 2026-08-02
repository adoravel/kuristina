//deno-lint-ignore-file
/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	extractMusicUrls,
	renderMusicLinkCard,
	resolveSongLink,
} from "@kuristina/services/musiclinks";
import { sendCompanion, suppressOriginalEmbed } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";

export async function handleMusicLinks(bot: typeof discord, message: Message): Promise<void> {
	const urls = extractMusicUrls(message.content).slice(0, 2);
	if (!urls.length) return;

	let sent = 0;
	for (const url of urls) {
		const resolved = await resolveSongLink(url);
		if (!resolved.ok) continue;
		await sendCompanion(bot, message, renderMusicLinkCard(resolved.value), "richlink");
		sent++;
	}
	if (sent) await suppressOriginalEmbed(bot, message);
}
