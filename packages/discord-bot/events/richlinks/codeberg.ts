/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import { extractBlobRefs, fetchSnippet } from "@kuristina/services/codeberg";
import { renderSnippet } from "@kuristina/embeds/codeberg";
import { sendCompanion, suppressOriginalEmbed } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";

export async function handleCodebergLinks(bot: typeof discord, message: Message): Promise<void> {
	if (!config.modules.linkEmbeds.codeberg) return;
	const refs = extractBlobRefs(message.content).slice(0, config.modules.linkEmbeds.maxPerMessage);
	if (!refs.length) return;

	let sent = 0;
	for (const ref of refs) {
		const snippet = await fetchSnippet(ref);
		if (!snippet.ok) continue;
		await sendCompanion(bot, message, renderSnippet(ref, snippet.value), "richlink:codeberg");
		sent++;
	}
	if (sent) await suppressOriginalEmbed(bot, message);
}
