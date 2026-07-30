/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type {
	Camelize,
	CreateMessageOptions,
	DiscordGatewayPayload,
	DiscordGetGatewayBot,
	EditMessage,
} from "@discordeno/types";
import type { DiscordClient } from "./types.ts";
import type { DiscordReady } from "@discordeno/bot";

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

function handleUserReady(app: DiscordClient, data: DiscordGatewayPayload) {
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

function patchAuthorisationHeader(client: DiscordClient) {
	const original = client.rest.createRequestBody;
	client.rest.createRequestBody = (method, options) => {
		const body = original.call(client.rest, method, options);
		body.headers.authorization = body.headers.authorization.slice(4);
		return body;
	};
}

function patchOutgoingRequestProcessing(client: DiscordClient) {
	const original = client.rest.processRequest;
	client.rest.processRequest = (opts) => {
		opts.runThroughQueue = false;
		return original.call(client.rest, opts);
	};
}

function patchMessageOperations(client: DiscordClient) {
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

export function monkeyPatchUserAppSupport(client: DiscordClient) {
	patchAuthorisationHeader(client);
	patchOutgoingRequestProcessing(client);
	client.rest.getSessionInfo = (): Promise<typeof sessionInfo> => {
		return Promise.resolve(sessionInfo);
	};
	client.handlers.READY = (bot, data) => handleUserReady(bot, data);
	patchMessageOperations(client);
}
