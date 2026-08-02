/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import discord from "@kuristina/discord-bot";
import { infer, StringStream } from "@kuristina/commands";
import { commandRegistry, prefix } from "@kuristina/commands/registry";
import { handleRichLinks } from "./richlinks/mod.ts";
import { repositories } from "@kuristina/database";
import { unsuppressOriginalEmbed } from "./richlinks/shared.ts";

export const messageCreate: typeof discord.events.messageCreate = async (message) => {
	if (message.author.bot || !message.guildId) return;

	const stream = new StringStream(message.content);
	const prefixResult = prefix(stream);

	if (infer("success")(prefixResult)) {
		await commandRegistry.execute(message, stream);
	}

	await handleRichLinks(discord, message);
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

	const existing = await repositories.messageCompanions.getForSource(message.id, "richlink");
	if (!existing.ok) return;

	if (existing.value.length) {
		for (const companion of existing.value) {
			await discord.helpers.deleteMessage(companion.channelId, companion.responseMessageId).catch(
				() => {},
			);
		}
		await repositories.messageCompanions.deleteForSource(message.id, "richlink");
	}

	await handleRichLinks(discord, message);

	const after = await repositories.messageCompanions.getForSource(message.id, "richlink");
	if (after.ok && !after.value.length) {
		await unsuppressOriginalEmbed(discord, message);
	}
	// const stream = new StringStream(message.content);

	// const prefixResult = prefix(stream);
	// if (!infer("success")(prefixResult)) return;

	// await commandRegistry.execute(message, stream);
};
