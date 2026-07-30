/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type discord from "@kuristina/discord-bot";
import { InteractionTypes } from "@kuristina/discord-bot";

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
	if (!customId || componentType === undefined) return;

	for (const handler of handlers) {
		if (componentType !== handler.kind || !customId.startsWith(handler.identifier)) continue;

		return await handler.fn?.(interaction);
	}
};

export default interactionCreate;
