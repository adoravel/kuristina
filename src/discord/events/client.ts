/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
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
