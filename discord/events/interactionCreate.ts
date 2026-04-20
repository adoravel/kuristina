import discord from "discord/bot";
import { InteractionTypes } from "discord/types";

export interface InteractionCreateHandlerOpts {
	identifier: string;
	kind: number;
}

type InteractionCreateHandler = {
	fn: typeof discord.events.interactionCreate;
} & InteractionCreateHandlerOpts;

export function setupInteractionHandler(
	opts: InteractionCreateHandlerOpts,
	fn: InteractionCreateHandler["fn"],
) {
	return handlers.push({ ...opts, fn });
}

const handlers: InteractionCreateHandler[] = [];

const interactionCreate: typeof discord.events.interactionCreate = async (interaction) => {
	if (
		interaction.type !== InteractionTypes.MessageComponent || !interaction.guildId ||
		!interaction.data
	) {
		return;
	}

	const { customId, componentType } = interaction.data;
	if (!customId || componentType) return;

	for (const handler of handlers) {
		if (componentType !== handler.kind || !customId.startsWith(handler.identifier)) continue;

		return await handler.fn?.(interaction);
	}
};

export default interactionCreate;
