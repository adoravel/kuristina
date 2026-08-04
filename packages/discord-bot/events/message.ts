/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord from "@kuristina/discord-bot";
import { StringStream } from "@kuristina/commands";
import { handleRichLinks } from "./richlinks/mod.ts";
import { repositories } from "@kuristina/database";
import { executeTextCommand } from "../../commands/core/text-adapter.ts";

export const messageCreate: typeof discord.events.messageCreate = async (message) => {
	if (message.author.bot || !message.guildId) return;

	const stream = new StringStream(message.content);
	await executeTextCommand(message, stream).catch(() => {});
	await handleRichLinks(discord, message).catch(() => {});
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

	const stream = new StringStream(message.content);
	await executeTextCommand(message, stream).catch(() => {});
	await handleRichLinks(discord, message).catch(() => {});
};
