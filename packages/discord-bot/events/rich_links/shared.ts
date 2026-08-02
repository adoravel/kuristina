/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { MessageFlags } from "@discordeno/bot";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import { type CompanionKind, repositories } from "@kuristina/database";

export function replyRef(message: Message) {
	return { messageId: message.id, channelId: message.channelId, guildId: message.guildId };
}

export async function suppressOriginalEmbed(bot: typeof discord, message: Message): Promise<void> {
	try {
		await bot.helpers.editMessage(message.channelId, message.id, {
			flags: message.flags?.add(MessageFlags.SuppressEmbeds).toJSON() ??
				MessageFlags.SuppressEmbeds,
		});
	} catch (e) {
		console.warn("  · rich-links: couldn't suppress original embed (needs Manage Messages):", e);
	}
}

export async function unsuppressOriginalEmbed(
	bot: typeof discord,
	message: Pick<Message, "id" | "channelId" | "flags">,
): Promise<void> {
	try {
		await bot.helpers.editMessage(message.channelId, message.id, {
			flags: message.flags?.remove(MessageFlags.SuppressEmbeds).toJSON() ?? 0,
		});
	} catch (e) {
		console.warn("  · rich-links: couldn't unsuppress original embed:", e);
	}
}

export async function sendCompanion(
	bot: typeof discord,
	message: Message,
	content: string,
	kind: CompanionKind,
): Promise<void> {
	const sent = await bot.helpers.sendMessage(message.channelId, {
		messageReference: replyRef(message),
		content,
	});
	await repositories.messageCompanions.add(message.id, sent.id, message.channelId, kind);
}
