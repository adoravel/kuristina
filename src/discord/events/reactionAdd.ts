import discord from "~/discord/bot";
import { Reaction } from "~/discord/types";

import * as markov from "~/services/markov/event.ts";

export const reactionAdd: typeof discord.events.reactionAdd = async (reaction: Reaction) => {
	const result = await markov.reactionAdd(reaction);
	if (!result.ok) console.error(result.error);
};
