/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { MessageFlags } from "@discordeno/bot";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import { type CompanionKind, repositories } from "@kuristina/database";
import type { CreateMessageOptions } from "@discordeno/types";

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
		logger.warn("rich-links: couldn't suppress original embed (needs Manage Messages): " + e);
	}
}

async function sendCompanion(
	bot: typeof discord,
	message: Message,
	payload: CreateMessageOptions,
	kind: CompanionKind,
	sourceUrl: string,
): Promise<void> {
	const sent = await bot.helpers.sendMessage(message.channelId, {
		...payload,
		messageReference: replyRef(message),
	});
	await repositories.messageCompanions.add(message.id, sent.id, message.channelId, kind, sourceUrl);
}

export async function reconcileCompanions<T>(
	bot: typeof discord,
	message: Message,
	kind: CompanionKind,
	items: T[],
	keyOf: (item: T) => string,
	render: (item: T) => Promise<CreateMessageOptions | undefined>,
): Promise<void> {
	const existingResult = await repositories.messageCompanions.getForSource(message.id, kind);
	const existing = existingResult.ok ? existingResult.value : [];

	const existingByKey = new Map(existing.filter((c) => c.sourceUrl).map((c) => [c.sourceUrl!, c]));
	const currentKeys = new Set(items.map(keyOf));

	const stale = existing.filter((c) => c.sourceUrl && !currentKeys.has(c.sourceUrl));
	if (stale.length) {
		for (const companion of stale) {
			await bot.helpers.deleteMessage(companion.channelId, companion.responseMessageId).catch(
				() => {},
			);
		}
		await repositories.messageCompanions.deleteResponses(
			message.id,
			stale.map((c) => c.responseMessageId),
		);
	}

	for (const item of items) {
		const key = keyOf(item);
		if (existingByKey.has(key)) continue;
		const payload = await render(item);
		if (!payload) continue;
		await sendCompanion(bot, message, payload, kind, key);
	}

	const finalResult = await repositories.messageCompanions.getForSource(message.id, kind);
	const hasCompanions = finalResult.ok && finalResult.value.length > 0;
	console.log((finalResult as any).value.length);

	if (hasCompanions) {
		await suppressOriginalEmbed(bot, message);
	}
}
