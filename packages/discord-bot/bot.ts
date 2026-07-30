/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { commandRegistry, commands } from "@kuristina/commands/registry";

import { createProxyCache } from "dd-cache-proxy";
import {
	createBot,
	createDesiredPropertiesObject,
	createLogger,
	GatewayIntents,
	LogLevels,
} from "@discordeno/bot";

import { getConfig } from "@kuristina/config";
import { closeDatabaseConnection, initialiseDatabase } from "@kuristina/database";

import { Ok, type Result } from "@kuristina/core";
import type { AppError } from "@kuristina/errors";

import { events } from "./events/mod.ts";

const desiredProperties = createDesiredPropertiesObject({
	user: {
		id: true,
		discriminator: true,
		username: true,
		globalName: true,
		avatar: true,
		banner: true,
		avatarDecorationData: true,
		toggles: true,
	},
	guild: {
		id: true,
		banner: true,
		icon: true,
		channels: true,
		name: true,
		emojis: true,
		stickers: true,
		roles: true,
		members: true,
		permissions: true,
		memberCount: true,
		presences: true,
		toggles: true,
	},
	roleColors: {
		primaryColor: true,
		secondaryColor: true,
		tertiaryColor: true,
	},
	member: {
		id: true,
		avatar: true,
		banner: true,
		user: true,
		nick: true,
		roles: true,
		guildId: true,
		joinedAt: true,
		permissions: true,
		toggles: true,
		avatarDecorationData: true,
	},
	message: {
		id: true,
		interaction: true,
		interactionMetadata: true,
		channelId: true,
		guildId: true,
		author: true,
		components: true,
		content: true,
		member: true,
		mentions: true,
		embeds: true,
		nonce: true,
		type: true,
		stickerItems: true,
		messageReference: true,
		attachments: true,
		editedTimestamp: true,
	},
	messageReference: {
		channelId: true,
		guildId: true,
		messageId: true,
	},
	channel: {
		id: true,
		guildId: true,
		name: true,
		topic: true,
		parentId: true,
		permissions: true,
		permissionOverwrites: true,
		position: true,
		memberCount: true,
		type: true,
	},
	defaultReactionEmoji: {
		emojiId: true,
		emojiName: true,
	},
	emoji: {
		id: true,
		name: true,
		roles: true,
		user: true,
	},
	role: {
		id: true,
		guildId: true,
		name: true,
		icon: true,
		colors: true,
		permissions: true,
		unicodeEmoji: true,
		flags: true,
		toggles: true,
		position: true,
		tags: true,
	},
	interaction: {
		id: true,
		guild: true,
		guildId: true,
		data: true,
		member: true,
		type: true,
		user: true,
		token: true,
		message: true,
		channel: true,
		channelId: true,
		context: true,
		version: true,
		locale: true,
	},
});

interface BotDesiredProperties extends Required<typeof desiredProperties> {}

const bot = createBot({
	token: getConfig().discord.token,
	desiredProperties: desiredProperties as BotDesiredProperties,
	intents: GatewayIntents.Guilds |
		GatewayIntents.GuildMembers |
		GatewayIntents.GuildMessageReactions |
		GatewayIntents.GuildMessages |
		GatewayIntents.MessageContent |
		GatewayIntents.DirectMessageReactions |
		GatewayIntents.GuildMessageReactions,
	loggerFactory: (name) => createLogger({ logLevel: LogLevels.Info, name }),
});

export type Bot = typeof bot;

bot.events = {
	ready: ({ user }) => {
		console.log(`meowing as ${user.tag} :3`);
	},
	...events,
};

const discord = createProxyCache(bot, {
	desiredProps: {
		guild: ["members", "roles", "channels"],
	},
});

export async function initialise(): Promise<Result<void, AppError>> {
	const result = await initialiseDatabase();
	if (!result.ok) return result;

	await discord.start();

	await Promise.all(
		[commands.help, commands.role, commands.ping, commands.translate].map(
			async (cmd) => commandRegistry.register(await cmd),
		),
	);

	return Ok(undefined);
}

export async function shutdown(): Promise<void> {
	closeDatabaseConnection();
	await discord.shutdown();
	console.log("goodbye :3");
}

export default discord;
