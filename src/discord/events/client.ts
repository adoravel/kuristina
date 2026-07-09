/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import client from "~/discord/client.ts";
import * as markov from "~/services/markov/event.ts";

export const reactionAdd: typeof client.events.reactionAdd = async (reaction) => {
	const result = await markov.reactionAdd(client, reaction);
	if (!result.ok) console.error(result.error);
};

export const messageCreate: typeof client.events.messageCreate = async (message) => {
	const result = await markov.messageCreate(client, message);
	if (!result.ok) console.error("[markov:messageCreate]", result.error);
};
