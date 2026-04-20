import discord from "discord/bot";
import { StringStream } from "~/lib/combinators/stream.ts";
import { prefix } from "~/lib/command/primitives.ts";
import { infer } from "~/lib/combinators/mod.ts";
import { commandRegistry, contextCache } from "~/lib/command/registry.tsx";

export const messageCreate: typeof discord.events.messageCreate = async (message) => {
	if (message.author.bot || !message.guildId) return;

	const stream = new StringStream(message.content);
	const prefixResult = prefix(stream);

	if (!infer("success")(prefixResult)) return;

	await commandRegistry.execute(message, stream);
};

export const messageDelete: typeof discord.events.messageDelete = async (message) => {
	const ctx = contextCache.get(message.id);
	if (ctx) {
		try {
			await discord.helpers.deleteMessage(
				message.channelId,
				message.id,
				"command deletion request",
			);
		} catch (error) {
			console.error("failed to delete command response:", error);
		}
		contextCache.delete(message.id);
	}
};

export const messageUpdate: typeof discord.events.messageUpdate = async (message) => {
	const ctx = contextCache.get(message.id);
	if (!ctx) return;

	const stream = new StringStream(message.content);

	const prefixResult = prefix(stream);
	if (!infer("success")(prefixResult)) return;

	await commandRegistry.execute(message, stream);
};
