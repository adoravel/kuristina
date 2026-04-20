/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { commandRegistry } from "~command/registry.tsx";

import { createProxyCache } from "dd-cache-proxy";
import { createBot, createDesiredPropertiesObject, GatewayIntents } from "@discordeno/bot";

import interactionCreate from "~/discord/events/interactionCreate.ts";
import { messageCreate, messageDelete, messageUpdate } from "~/discord/events/messageHandling.ts";
import { getConfig } from "~/config/mod.ts";

const config = getConfig();

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
	role: {
		id: true,
		guildId: true,
		name: true,
		icon: true,
		color: true,
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
	token: config.discord.token,
	desiredProperties: desiredProperties as BotDesiredProperties,
	intents: GatewayIntents.Guilds |
		GatewayIntents.GuildMembers |
		GatewayIntents.GuildMessageReactions |
		GatewayIntents.GuildMessages |
		GatewayIntents.MessageContent,
});

bot.events = {
	ready: ({ user }) => {
		console.log(`meowing as ${user.tag} :3`);
	},
	interactionCreate: interactionCreate,
	messageCreate: messageCreate,
	messageUpdate: messageUpdate,
	messageDelete: messageDelete,
};

const discord = createProxyCache(bot, {
	desiredProps: {
		guild: ["members", "roles", "channels"],
	},
});

export async function initialise() {
	await discord.start();

	const importCommand = async (name: string) => {
		const isStar = name.charCodeAt(0) === 42; // '*'
		const cleanName = isStar ? name.slice(1) : name;
		const ext = isStar ? "ts" : "tsx";

		const command = (await import(`~/command/${cleanName}.${ext}`)).default;
		commandRegistry.register(command);
	};

	await Promise.all(
		["help", "role", "*ping"].map(importCommand),
	);
}

export default discord;
