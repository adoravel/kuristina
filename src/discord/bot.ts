/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { commandRegistry } from "~/lib/command/registry.tsx";

import { createProxyCache } from "dd-cache-proxy";
import {
	createBot,
	createDesiredPropertiesObject,
	createLogger,
	GatewayIntents,
	LogLevels,
} from "@discordeno/bot";

import events from "~/discord/events/mod.ts";
import { cfg, getConfig } from "~/config/mod.ts";
import { initialiseDatabase } from "~/database/mod.ts";
import { AppError } from "~/lib/errors.ts";
import { Ok, Result } from "~/lib/result.ts";
import { monkeyPatchUserAppSupport } from "~/discord/client.ts";

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
	token: getConfig().discord.token,
	desiredProperties: desiredProperties as BotDesiredProperties,
	intents: GatewayIntents.Guilds |
		GatewayIntents.GuildMembers |
		GatewayIntents.GuildMessageReactions |
		GatewayIntents.GuildMessages |
		GatewayIntents.MessageContent,
	loggerFactory: (name) => createLogger({ logLevel: LogLevels.Debug, name }),
});

export type Bot = typeof bot;

if (cfg("client")) {
	monkeyPatchUserAppSupport(bot);
}

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
	const result = initialiseDatabase();
	if (!result.ok) return result;

	await discord.start();

	const commandManifest = [
		{ filename: "help.tsx", module: "commands.help" },
		{ filename: "role.tsx", module: "commands.role" },
		{ filename: "ping.ts", module: "commands.ping" },
	] as const;

	await Promise.all(
		commandManifest
			.filter(({ module }) => cfg(module))
			.map(({ filename }) =>
				import(`~/command/${filename}`)
					.then((m) => commandRegistry.register(m.default))
			),
	);

	return Ok(undefined);
}

export default discord;
