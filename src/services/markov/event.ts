import { getConfig } from "~/config/mod.ts";
import { generate, learn } from "~/services/markov/mod.ts";
import { SqlError } from "~/database/errors.ts";
import { Ok, Result } from "~/lib/result.ts";

import { Message } from "~/discord/types";
import discord from "~/discord/bot";

let chatMessageCount = 0, chatTriggerThreshold = 0;

let lastReplyTimestamp = 0;
const REPLY_COOLDOWN_MS = 2500;

function resetMarkovTrigger() {
	chatMessageCount = 0;
	chatTriggerThreshold = Math.floor(Math.random() * (24 - 12 + 1)) + 12;
	console.log(`  · markov: next message in ${chatTriggerThreshold} messages.`);
}

export async function messageCreate(message: Message): Promise<Result<void, SqlError>> {
	if (
		message.author.id === getConfig().discord.applicationId ||
		message.channelId !== getConfig().modules.markov.channelId
	) return Ok(undefined);

	if (!chatTriggerThreshold) resetMarkovTrigger();

	// if (message.content.match(/^[^\p{L}]/u)) return Ok(undefined);

	const learnt = learn(message.content);
	if (!learnt.ok) return learnt;

	const isReplyToBot = !!message.mentions?.find((x) => x.id === 1399158285621395516n);

	const now = Date.now();
	let shouldTrigger = ++chatMessageCount >= chatTriggerThreshold;

	if (!shouldTrigger && isReplyToBot) {
		if (now - lastReplyTimestamp > REPLY_COOLDOWN_MS) {
			console.log("  · markov: valid reply detected.");
			shouldTrigger = true;
			lastReplyTimestamp = now;
		} else {
			console.log("  · markov: reply ignored (cooldown active).");
			return Ok(undefined);
		}
	}

	let result = generate();
	if (!result.ok) return result;

	console.log(
		"  · markov: learnt, sample gen.:",
		`"${result.value}" -${chatTriggerThreshold - chatMessageCount}`,
	);

	if (++chatMessageCount < chatTriggerThreshold && !shouldTrigger) {
		return Ok(undefined);
	}

	console.log(`  · markov: triggering generation...`);

	result = generate();
	if (!result.ok) return result;

	try {
		await discord.helpers.sendMessage(message.channelId, {
			content: result.value,
			messageReference: isReplyToBot
				? {
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId,
					failIfNotExists: false,
				}
				: undefined,
		});
		console.log(`  · markov: sent "${result.value}"`);
	} catch (err) {
		console.error("    · markov error:", err);
	}

	resetMarkovTrigger();
	return Ok(undefined);
}
