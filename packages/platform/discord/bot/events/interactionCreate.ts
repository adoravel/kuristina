/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord, { InteractionResponseTypes } from "@kuristina/discord-bot";
import { type Interaction, InteractionTypes } from "@kuristina/discord-bot";
import { dispatchSlashInteraction } from "@kuristina/commands/core";
import { waiters } from "@kuristina/core";
import { ackWithMessage } from "../interactions/respond.ts";

async function handleComponentInteraction(interaction: Interaction): Promise<boolean> {
	const customId = interaction.data?.customId;
	if (!customId) return false;

	const entry = waiters.get(customId);
	if (!entry) return false;

	if (entry.filter && !entry.filter(interaction)) {
		await ackWithMessage(interaction, { content: "Maybe don't.", ephemeral: true })
			.catch(() => {});
		return true;
	}

	clearTimeout(entry.timeoutId);
	waiters.delete(customId);
	entry.resolve(interaction);
	return true;
}

const interactionCreate: typeof discord.events.interactionCreate = async (interaction) => {
	if (
		interaction.type === InteractionTypes.ApplicationCommand ||
		interaction.type === InteractionTypes.ApplicationCommandAutocomplete
	) {
		return await dispatchSlashInteraction(interaction);
	}

	if (interaction.type === InteractionTypes.MessageComponent && interaction.data?.customId) {
		const handled = await handleComponentInteraction(interaction);
		if (!handled) {
			await discord.helpers.sendInteractionResponse(interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			}).catch(() => {});
		}
	}
};

export default interactionCreate;
