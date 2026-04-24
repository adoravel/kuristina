/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord from "~/discord/bot";
import { Reaction } from "~/discord/types";

import * as markov from "~/services/markov/event.ts";

export const reactionAdd: typeof discord.events.reactionAdd = async (reaction: Reaction) => {
	const result = await markov.reactionAdd(reaction);
	if (!result.ok) console.error(result.error);
};
