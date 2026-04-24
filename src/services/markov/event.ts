/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cfg, getConfig } from "~/config/mod.ts";
import { generate, learn } from "~/services/markov/mod.ts";
import { SqlError } from "~/database/errors.ts";
import { Ok, Result } from "~/lib/result.ts";

import { Message, Reaction } from "~/discord/types";
import discord from "~/discord/bot";
import { AppError } from "~/lib/errors.ts";
import { translateOne } from "~/services/deepl/mod.ts";
import { TimedMap } from "~/lib/util/map.ts";
import { TranslateOptions } from "~/services/deepl/types.ts";

let chatMessageCount = 0, chatTriggerThreshold = 0;

let lastReplyTimestamp = 0;
const REPLY_COOLDOWN_MS = 2500;

const memory = new TimedMap<bigint, Message>(9e5); // 15 min

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
		const sent = await discord.helpers.sendMessage(message.channelId, {
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

		memory.set(sent.id, sent);

		console.log(`  · markov: sent "${result.value}"`);
	} catch (err) {
		console.error("    · markov error:", err);
	}

	resetMarkovTrigger();
	return Ok(undefined);
}

export async function reactionAdd(reaction: Reaction): Promise<Result<void, AppError>> {
	if (!cfg("deepl")) return Ok(undefined);

	if (
		reaction.messageAuthorId !== getConfig().discord.applicationId ||
		reaction.channelId !== getConfig().modules.markov.channelId
	) return Ok(undefined);

	if (reaction.emoji.name !== "❔") return Ok(undefined);

	const message = memory.get(reaction.messageId);
	if (!message?.content) {
		console.error("  · markov(translate): failed to retrieve:", reaction);
		return Ok(undefined);
	}

	const params: TranslateOptions = {
		formality: "prefer_less",
		modelType: "prefer_quality_optimized",
		preserveFormatting: true,
		splitSentences: "1",
	};
	let result = await translateOne(message.content, "EN", params);
	if (!result.ok) return result;

	let { text, detectedSourceLang } = result.value;

	if (detectedSourceLang.startsWith("EN")) {
		result = await translateOne(message.content, "PT", params);
		if (!result.ok) return result;
		text = result.value.text;
		detectedSourceLang = result.value.detectedSourceLang;
	}

	let requester = `snowflake(${reaction.userId})`;
	if (reaction.user?.username) {
		requester = `@${reaction.user.username}, ${requester}`;
	}

	console.log(
		`  · markov(translate): "${message.content}" → "${text}", requested by ${requester}`,
	);
	await discord.helpers.editMessage(reaction.channelId, reaction.messageId, { content: text });
	return Ok(undefined);
}
