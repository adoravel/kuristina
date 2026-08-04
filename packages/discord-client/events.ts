/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import client from "@kuristina/discord-client";
import * as markov from "@kuristina/services/markov";
import { safePromise } from "@kuristina/core";
import discord from "@kuristina/discord-bot";

export const reactionAdd: typeof client.events.reactionAdd = async (reaction) => {
	const message = await safePromise(
		discord.helpers.getMessage(reaction.channelId, reaction.messageId),
	);

	if (!message.ok) {
		return logger.boo("markov: failed to fetch message:", message.error);
	}

	const result = await markov.translateReactedMessage(client, message.value, reaction);
	if (!result.ok) logger.boo("markov(reactionAdd):", result.error);
};

export const messageCreate: typeof client.events.messageCreate = async (message) => {
	const result = await markov.messageCreate(client, message);
	if (!result.ok) logger.boo("markov(messageCreate):", result.error);
};
