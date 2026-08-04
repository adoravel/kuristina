/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { MessageFlags } from "@discordeno/bot";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import { type CompanionKind, type MessageCompanion, repositories } from "@kuristina/database";
import type { CreateMessageOptions } from "@discordeno/types";
import { mapWithConcurrency } from "@kuristina/core";

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
	let sent;
	try {
		sent = await bot.helpers.sendMessage(message.channelId, {
			...payload,
			messageReference: {
				messageId: message.id,
				channelId: message.channelId,
				guildId: message.guildId,
				failIfNotExists: true,
			},
		});
	} catch {
		return;
	}
	await repositories.messageCompanions.add(message.id, sent.id, message.channelId, kind, sourceUrl);
}

export async function reconcileCompanions<T>(
	bot: typeof discord,
	message: Message,
	kind: CompanionKind,
	items: T[],
	keyOf: (item: T) => string,
	render: (item: T) => Promise<CreateMessageOptions | undefined>,
	existing?: MessageCompanion[],
): Promise<void> {
	if (!existing || existing.length === 0) {
		const existingResult = await repositories.messageCompanions.getForSource(message.id, kind);
		existing = existingResult.ok ? existingResult.value : [];
	} else {
		existing = existing.filter((c) => c.kind === kind);
	}

	const existingByKey = new Map(existing.filter((c) => c.sourceUrl).map((c) => [c.sourceUrl!, c]));
	const currentKeys = new Set(items.map(keyOf));

	const stale = existing.filter((c) => c.sourceUrl && !currentKeys.has(c.sourceUrl));
	if (stale.length) {
		await repositories.messageCompanions.deleteResponses(
			message.id,
			stale.map((c) => c.responseMessageId),
		);
		for (const companion of stale) {
			await bot.helpers.deleteMessage(companion.channelId, companion.responseMessageId)
				.catch((e) => logger.warn("rich-links: failed to delete stale companion message:", e));
		}
	}

	const toRender = items.filter((item) => !existingByKey.has(keyOf(item)));
	if (toRender.length) {
		await mapWithConcurrency(toRender, 5, async (item) => {
			const payload = await render(item);
			if (!payload) return;
			await sendCompanion(bot, message, payload, kind, keyOf(item));
		});
	}

	const remainingExisting = existing.filter((c) => c.sourceUrl && currentKeys.has(c.sourceUrl));
	const hasCompanions = remainingExisting.length > 0 || toRender.length > 0;
	if (hasCompanions) {
		await suppressOriginalEmbed(bot, message);
	}
}
