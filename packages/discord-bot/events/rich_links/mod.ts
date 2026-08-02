/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { handleGitHubLinks } from "./github.ts";
import { handleTwitterLinks } from "./twitter.ts";
import { handleFediverseLinks } from "./fediverse.ts";
import { handleMusicLinks } from "./song_links.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";

export async function handleRichLinks(bot: typeof discord, message: Message): Promise<void> {
	if (message.author.bot) return;

	await Promise.all([
		handleGitHubLinks(bot, message),
		handleTwitterLinks(bot, message),
		handleFediverseLinks(bot, message),
		handleMusicLinks(bot, message),
	]);
}
