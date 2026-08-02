//deno-lint-ignore-file
/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	extractMusicUrls,
	renderPlatformLinks,
	resolveSongLink,
} from "@kuristina/services/song_links";
import { replyRef, suppressOriginalEmbed } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";

// todo
export async function handleMusicLinks(bot: typeof discord, message: Message): Promise<void> {
	// const urls = extractMusicUrls(message.content).slice(0, 2);
	// if (!urls.length) return;

	// let sent = 0;
	// for (const url of urls) {
	// const resolved = await resolveSongLink(url);
	// if (!resolved.ok) continue;
	// await bot.helpers.sendMessage(message.channelId, {
	// messageReference: replyRef(message),
	// content: `**${resolved.value.title}**${
	// resolved.value.artist ? ` — ${resolved.value.artist}` : ""
	// }\n${renderPlatformLinks(resolved.value)}`,
	// });
	// sent++;
	// }
	// if (sent) await suppressOriginalEmbed(bot, message);
}
