/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord, { InteractionResponseTypes, MessageFlags } from "@kuristina/discord-bot";
import type { CreateMessageOptions, Interaction } from "@kuristina/discord-bot";

export async function ackDeferUpdate(interaction: Interaction): Promise<void> {
	await discord.helpers.sendInteractionResponse(interaction.id, interaction.token, {
		type: InteractionResponseTypes.DeferredUpdateMessage,
	});
}

export async function ackWithMessage(
	interaction: Interaction,
	content: CreateMessageOptions & { ephemeral?: boolean },
): Promise<void> {
	const { ephemeral, ...data } = content;
	try {
		await discord.helpers.sendInteractionResponse(interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: { ...data, flags: ephemeral ? (data.flags ?? 0) | MessageFlags.Ephemeral : data.flags },
		});
	} catch (e) {
		const alreadyAcked = e instanceof Error && e.message.includes("40060");
		if (!alreadyAcked) throw e;

		logger.warn(
			`ackWithMessage: interaction ${interaction.id} was already acked, falling back to followup`,
		);
		await discord.helpers.sendFollowupMessage(interaction.token, {
			...data,
			flags: ephemeral ? (data.flags ?? 0) | MessageFlags.Ephemeral : data.flags,
		});
	}
}
