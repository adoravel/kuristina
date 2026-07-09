/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	Camelize,
	DiscordGatewayPayload,
	DiscordGetGatewayBot,
	GatewayIntents,
} from "@discordeno/types";
import {
	createBot,
	createDesiredPropertiesObject,
	createLogger,
	DiscordReady,
	LogLevels,
} from "@discordeno/bot";
import { CreateMessageOptions, EditMessage } from "~/discord/types";
import { getConfig } from "~/config/mod.ts";
import * as events from "~/discord/events/client.ts";
import { createProxyCache } from "dd-cache-proxy";
import { Client } from "~/discord/client/types";

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

const sessionInfo: Camelize<DiscordGetGatewayBot> = {
	url: "wss://gateway.discord.gg",
	shards: 1,
	sessionStartLimit: {
		maxConcurrency: 1,
		remaining: 999,
		resetAfter: 14400000,
		total: 1000,
	},
};

function handleUserReady(app: Client, data: DiscordGatewayPayload) {
	if (!app.events.ready) return;

	const payload = data.d as DiscordReady;
	app.events.ready(
		{
			shardId: 0,
			v: payload.v,
			user: app.transformers.user(app, payload.user),
			guilds: payload.guilds.map((p) => app.transformers.snowflake(p.id)),
			sessionId: payload.session_id,
			shard: payload.shard,
			applicationId: BigInt(app.id = app.transformers.snowflake(payload.user.id)),
		},
		payload,
	);
}

function patchAuthorisationHeader() {
	const original = client.rest.createRequestBody;
	client.rest.createRequestBody = (method, options) => {
		const body = original.call(client.rest, method, options);
		body.headers.authorization = body.headers.authorization.slice(4);
		return body;
	};
}

function patchOutgoingRequestProcessing() {
	const original = client.rest.processRequest;
	client.rest.processRequest = (opts) => {
		opts.runThroughQueue = false;
		return original.call(client.rest, opts);
	};
}

function patchMessageOperations() {
	const applyCommonProperties = (opts: CreateMessageOptions | EditMessage) => {
		(opts as any).mobileNetworkType ??= "unknown";
		opts.flags ??= 0;
	};

	const send = client.rest.sendMessage, edit = client.rest.editMessage;

	client.rest.sendMessage = (channelId, opts) => {
		opts.tts ??= false;
		opts.nonce ??= Math.floor(Date.now() / 1000);
		return applyCommonProperties(opts), send.call(client.rest, channelId, opts);
	};

	client.rest.editMessage = (channelId, messageId, opts) => {
		return applyCommonProperties(opts), edit.call(client.rest, channelId, messageId, opts);
	};
}

export function monkeyPatchUserAppSupport() {
	patchAuthorisationHeader();
	patchOutgoingRequestProcessing();
	client.rest.getSessionInfo = (): Promise<typeof sessionInfo> => {
		return Promise.resolve(sessionInfo);
	};
	client.handlers.READY = (bot, data) => handleUserReady(bot, data);
	patchMessageOperations();
}

export function initialiseClient() {
	monkeyPatchUserAppSupport();

	client.events = {
		ready: ({ user }) => console.log(`markov client meowing as ${user.tag} :3`),
		...events,
	};

	return createProxyCache(client, { desiredProps: { guild: [] } });
}

export default client;
