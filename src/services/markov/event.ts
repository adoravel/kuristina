import { cfg, getConfig } from "~/config/mod.ts";
import { generate, learn } from "~/services/markov/mod.ts";
import { SqlError } from "~/database/errors.ts";
import { Ok, Result } from "~/lib/result.ts";

import { Message } from "~/discord/types";
import discord from "~/discord/bot";

let chatMessageCount = 0, chatTriggerThreshold = 0;

function resetMarkovTrigger() {
	chatMessageCount = 0;
	chatTriggerThreshold = Math.floor(Math.random() * (25 - 12 + 1)) + 12;
	console.log(`  · markov: next message in ${chatTriggerThreshold} messages.`);
}

export async function messageCreate(message: Message): Promise<Result<void, SqlError>> {
	if (!chatTriggerThreshold) resetMarkovTrigger();

	if (message.channelId !== getConfig().modules.markov.channelId) return Ok(undefined);

	// if (message.content.match(/^[^\p{L}]/u)) return Ok(undefined);

	const learnt = learn(message.content);
	if (!learnt.ok) return learnt;

	let result = generate();
	if (!result.ok) return result;

	console.log("  · markov: learned, current gen.:", `"${result.value}"`);

	if (++chatMessageCount < chatTriggerThreshold) {
		return Ok(undefined);
	}

	console.log(`  · markov: triggering generation (count: ${chatMessageCount})...`);

	result = generate();
	if (!result.ok) return result;

	try {
		await discord.helpers.sendMessage(message.channelId, {
			content: result.value,
		});
		console.log(`  · markov "${result.value}"`);
	} catch (err) {
		console.error("    · markov error:", err);
	}

	resetMarkovTrigger();
	return Ok(undefined);
}
