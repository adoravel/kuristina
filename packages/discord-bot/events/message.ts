/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord from "@kuristina/discord-bot";
import { infer, StringStream } from "@kuristina/commands";
import { commandRegistry, prefix } from "@kuristina/commands/registry";
import { handleRichLinks } from "./richlinks/mod.ts";
import { repositories } from "@kuristina/database";

export const messageCreate: typeof discord.events.messageCreate = async (message) => {
	if (message.author.bot || !message.guildId) return;

	handleRichLinks(discord, message);

	const stream = new StringStream(message.content);
	const prefixResult = prefix(stream);

	if (infer("success")(prefixResult)) {
		await commandRegistry.execute(message, stream);
	}
};

export const messageDelete: typeof discord.events.messageDelete = async (message) => {
	const linked = await repositories.messageCompanions.getForSource(message.id);
	if (!linked.ok || !linked.value.length) return;

	for (const companion of linked.value) {
		await discord.helpers.deleteMessage(companion.channelId, companion.responseMessageId).catch(
			() => {},
		);
	}
	await repositories.messageCompanions.deleteForSource(message.id);
};

export const messageUpdate: typeof discord.events.messageUpdate = async (message) => {
	if (message.author.bot) return;

	handleRichLinks(discord, message);

	const stream = new StringStream(message.content);
	const prefixResult = prefix(stream);
	if (infer("success")(prefixResult)) {
		await commandRegistry.execute(message, stream);
		return;
	}

	const stale = await repositories.messageCompanions.getForSource(message.id, "command");
	if (stale.ok && stale.value.length) {
		for (const companion of stale.value) {
			await discord.helpers.deleteMessage(companion.channelId, companion.responseMessageId).catch(
				() => {},
			);
		}
		await repositories.messageCompanions.deleteForSource(message.id, "command");
	}
};
