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
import { sleep } from "@kuristina/core";

const editQueue = new Map<string, Promise<void>>();
const EDIT_DELAY_MS = 250;

function queueEdit(channelId: bigint, fn: () => Promise<void>): Promise<void> {
	const key = channelId.toString();
	const previous = editQueue.get(key) || Promise.resolve();

	const next = previous.then(async () => {
		await sleep(EDIT_DELAY_MS);
		await fn();
	});

	editQueue.set(key, next);
	return next;
}

export function replyRef(message: Message) {
	return { messageId: message.id, channelId: message.channelId, guildId: message.guildId };
}

export async function suppressOriginalEmbed(bot: typeof discord, message: Message): Promise<void> {
	try {
		await queueEdit(message.channelId, async () => {
			await bot.helpers.editMessage(message.channelId, message.id, {
				flags: message.flags?.add(MessageFlags.SuppressEmbeds).toJSON() ??
					MessageFlags.SuppressEmbeds,
			});
		});
	} catch (e) {
		logger.warn("rich-links: couldn't suppress original embed (needs Manage Messages): " + e);
	}
}

export async function unsuppressOriginalEmbed(
	bot: typeof discord,
	message: Message,
): Promise<void> {
	try {
		await queueEdit(message.channelId, async () => {
			await bot.helpers.editMessage(message.channelId, message.id, {
				flags: message.flags?.remove(MessageFlags.SuppressEmbeds).toJSON() ?? 0,
			});
		});
	} catch (e) {
		logger.warn("rich-links: couldn't unsuppress original embed: " + e);
	}
}

export async function sendCompanion(
	bot: typeof discord,
	message: Message,
	payload: CreateMessageOptions,
	kind: CompanionKind,
): Promise<void> {
	const sent = await bot.helpers.sendMessage(message.channelId, {
		...payload,
		messageReference: replyRef(message),
	});
	await repositories.messageCompanions.add(message.id, sent.id, message.channelId, kind);
}
