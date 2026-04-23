import { Bot } from "~/discord/bot";
import { Camelize, DiscordGatewayPayload, DiscordGetGatewayBot } from "@discordeno/types";
import { DiscordReady } from "@discordeno/bot";

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

export function handleUserReady(bot: Bot, data: DiscordGatewayPayload) {
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

export function patchAuthorisationHeader(bot: Bot) {
	const original = bot.rest.createRequestBody;
	bot.rest.createRequestBody = (method, options) => {
		const body = original.call(bot.rest, method, options);
		body.headers.authorization = body.headers.authorization.slice(4);
		return body;
	};

	const original2 = bot.rest.processRequest;
	bot.rest.processRequest = async (opts) => {
		opts.runThroughQueue = false;
		return await original2.call(bot.rest, opts) as any;
	};
}

export function monkeyPatchUserAppSupport(bot: Bot) {
	patchAuthorisationHeader(bot);
	bot.rest.getSessionInfo = (): Promise<typeof sessionInfo> => {
		return Promise.resolve(sessionInfo);
	};
	bot.handlers.READY = (bot, data) => handleUserReady(bot, data);
}
