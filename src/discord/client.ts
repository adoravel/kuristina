import { Bot } from "~/discord/bot";
import { Camelize, DiscordGatewayPayload, DiscordGetGatewayBot } from "@discordeno/types";
import { DiscordReady } from "@discordeno/bot";
import { CreateMessageOptions, EditMessage } from "~/discord/types";

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

function handleUserReady(bot: Bot, data: DiscordGatewayPayload) {
	if (!bot.events.ready) return;

	const payload = data.d as DiscordReady;
	bot.events.ready(
		{
			shardId: 0,
			v: payload.v,
			user: bot.transformers.user(bot, payload.user),
			guilds: payload.guilds.map((p) => bot.transformers.snowflake(p.id)),
			sessionId: payload.session_id,
			shard: payload.shard,
			applicationId: BigInt(bot.id = bot.transformers.snowflake(payload.user.id)),
		},
		payload,
	);
}

function patchAuthorisationHeader(bot: Bot) {
	const original = bot.rest.createRequestBody;
	bot.rest.createRequestBody = (method, options) => {
		const body = original.call(bot.rest, method, options);
		body.headers.authorization = body.headers.authorization.slice(4);
		return body;
	};
}

function patchOutgoingRequestProcessing(bot: Bot) {
	const original = bot.rest.processRequest;
	bot.rest.processRequest = (opts) => {
		opts.runThroughQueue = false;
		return original.call(bot.rest, opts);
	};
}

function patchMessageOperations(bot: Bot) {
	const applyCommonProperties = (opts: CreateMessageOptions | EditMessage) => {
		(opts as any).mobileNetworkType ??= "unknown";
		opts.flags ??= 0;
	};

	const send = bot.rest.sendMessage, edit = bot.rest.editMessage;

	bot.rest.sendMessage = (channelId, opts) => {
		opts.tts ??= false;
		opts.nonce ??= Math.floor(Date.now() / 1000);
		return applyCommonProperties(opts), send.call(bot.rest, channelId, opts);
	};

	bot.rest.editMessage = (channelId, messageId, opts) => {
		return applyCommonProperties(opts), edit.call(bot.rest, channelId, messageId, opts);
	};
}

export function monkeyPatchUserAppSupport(bot: Bot) {
	patchAuthorisationHeader(bot);
	patchOutgoingRequestProcessing(bot);
	bot.rest.getSessionInfo = (): Promise<typeof sessionInfo> => {
		return Promise.resolve(sessionInfo);
	};
	bot.handlers.READY = (bot, data) => handleUserReady(bot, data);
	patchMessageOperations(bot);
}
