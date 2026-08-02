/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { handleGitHubLinks } from "./github.ts";
import { handleCodebergLinks } from "./codeberg.ts";
import { handleTwitterLinks } from "./twitter.ts";
import { handleFediverseLinks } from "./fediverse.ts";
import { handleMusicLinks } from "./musiclinks.ts";
import { unsuppressOriginalEmbed } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import { repositories } from "@kuristina/database";

const PROVIDERS = [
	handleGitHubLinks,
	handleCodebergLinks,
	handleTwitterLinks,
	handleFediverseLinks,
	handleMusicLinks,
];

export async function handleRichLinks(bot: typeof discord, message: Message): Promise<void> {
	if (message.author.bot) return;

	const existing = await repositories.messageCompanions.getForSourceByPrefix(
		message.id,
		"richlink:",
	);
	const hadRichLinks = existing.ok && existing.value.length > 0;

	await Promise.all(PROVIDERS.map((handle) => handle(bot, message)));

	const remaining = await repositories.messageCompanions.getForSourceByPrefix(
		message.id,
		"richlink:",
	);
	const hasRichLinks = remaining.ok && remaining.value.length > 0;

	if (hadRichLinks && !hasRichLinks) {
		await unsuppressOriginalEmbed(bot, message);
	}
}
