/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { GatewayIntents } from "@discordeno/types";
import { createBot, createDesiredPropertiesObject, createLogger, LogLevels } from "@discordeno/bot";
import { getConfig } from "@kuristina/config";
import { createProxyCache } from "dd-cache-proxy";
import { monkeyPatchUserAppSupport } from "./patcher.ts";

import * as events from "./events.ts";

const desiredProperties = createDesiredPropertiesObject({
	user: { id: true, username: true, discriminator: true },
	member: { id: true },
	guild: { id: true },
	message: {
		id: true,
		channelId: true,
		guildId: true,
		author: true,
		content: true,
		mentions: true,
		reactions: true,
	},
	channel: { id: true, guildId: true, type: true },
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
});

const client = createBot({
	token: getConfig().discord.client.token,
	desiredProperties: desiredProperties as ClientDesiredProperties,
	intents: GatewayIntents.Guilds |
		GatewayIntents.GuildMessages |
		GatewayIntents.MessageContent |
		GatewayIntents.GuildMessageReactions |
		GatewayIntents.DirectMessageReactions,
	loggerFactory: (name) => createLogger({ logLevel: LogLevels.Info, name }),
});

interface ClientDesiredProperties extends Required<typeof desiredProperties> {}

export function initialiseClient() {
	monkeyPatchUserAppSupport(client);

	client.events = {
		ready: ({ user }) => console.log(`markov client meowing as ${user.tag} :3`),
		...events,
	};

	return createProxyCache(client, { desiredProps: { guild: [] } });
}

export default client;
