/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { cfg, getConfig } from "~/config/mod.ts";
import { generate, learn, sampleWord } from "~/services/markov/mod.ts";
import { SqlError } from "~/database/errors.ts";
import { discard, Ok, or, Result, safePromise, tapError } from "~/lib/result.ts";

import { AppError } from "~/lib/errors.ts";
import { translateOne } from "~/services/deepl/mod.ts";
import { TimedMap } from "~/lib/util/map.ts";
import { TranslateOptions } from "~/services/deepl/types.ts";
import { applyReplacements } from "~/services/markov/replacements.ts";
import { Client, Message, Reaction } from "~/discord/client/types";

type ChannelState = {
	chatMessageCount: number;
	chatTriggerThreshold: number;
	lastReplyTimestamp: number;
	lastReactionTimestamp: number;
};

const channelState = new Map<bigint, ChannelState>();

function getState(channelId: bigint): ChannelState {
	let state = channelState.get(channelId);
	if (!state) {
		channelState.set(
			channelId,
			state = {
				chatMessageCount: 0,
				chatTriggerThreshold: 0,
				lastReplyTimestamp: 0,
				lastReactionTimestamp: 0,
			},
		);
	}
	return state;
}

const memory = new TimedMap<bigint, Message>(1.8e6); // 30 min

function cooldownFor(channelId: bigint): number {
	const { cooldownMs, channelCooldowns } = getConfig().modules.markov;
	return channelCooldowns[channelId.toString()] ?? cooldownMs;
}

function resetMarkovTrigger(state: ChannelState) {
	const { min, max } = getConfig().modules.markov.triggerThreshold;
	state.chatMessageCount = 0;
	state.chatTriggerThreshold = Math.floor(Math.random() * (max - min + 1)) + min;
	console.log(`  · markov: next message in ${state.chatTriggerThreshold} messages.`);
}

const isTrackedChannel = (channelId: bigint) =>
	getConfig().modules.markov.channelIds.includes(channelId);

const stripDiacritics = (input: string) => input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export async function messageCreate(
	client: Client,
	message: Message,
): Promise<Result<void, SqlError>> {
	if (
		message.author.id === getConfig().discord.client.applicationId ||
		message.author.id === getConfig().discord.applicationId
	) {
		memory.set(message.id, message);
		return Ok(undefined);
	}
	if (!isTrackedChannel(message.channelId)) return Ok(undefined);

	const state = getState(message.channelId);
	if (!state.chatTriggerThreshold) resetMarkovTrigger(state);

	const learnt = learn(message.content);
	if (!learnt.ok) return learnt;

	const isReplyToBot =
		!!message.mentions?.find((x) => x.id === getConfig().discord.client.applicationId) ||
		getConfig().modules.markov.pattern.test(stripDiacritics(message.content));

	const now = Date.now();
	const cooldownMs = cooldownFor(message.channelId);
	let shouldTrigger = ++state.chatMessageCount >= state.chatTriggerThreshold;

	if (!shouldTrigger && isReplyToBot) {
		if (now - state.lastReplyTimestamp > cooldownMs) {
			console.log("  · markov: valid reply detected.");
			shouldTrigger = true;
			state.lastReplyTimestamp = now;
		} else {
			console.log("  · markov: reply ignored (cooldown active).");
			return Ok(undefined);
		}
	}

	const { singleWordChance, urlConcatChance, urlOnlyChance } = getConfig().modules.markov;
	let result;

	if (Math.random() * 100 < singleWordChance) {
		console.log("  · markov: generating single word...");
		result = or(generate())(
			tapError<string, SqlError>((e) => {
				console.log("  · failed to generate single word:", e);
			})(sampleWord()),
		);
	} else {
		console.log(`  · markov: triggering generation...`);
		result = tapError<string, SqlError>(console.error)(generate());
	}
	if (!result.ok) return result;

	console.log(
		"  · markov:",
		`"${result.value}" -${state.chatTriggerThreshold - state.chatMessageCount}`,
	);

	if (!shouldTrigger) {
		return Ok(undefined);
	}

	let { value } = result;
	const roll = Math.random() * 1000;

	if (roll < urlConcatChance) {
		console.log(`  · markov: triggering url concat...`);
		result = generate("https://");
		if (result.ok) value += " " + result.value;
	} else if (roll < urlOnlyChance) {
		console.log(`  · markov: triggering url only...`);
		result = generate("https://");
		if (result.ok) value = result.value;
	} else {
		result = generate();
		if (result.ok) value = result.value;
	}
	if (!result.ok) return result;

	value = applyReplacements(value, message.guildId);
	const sent = await safePromise(client.helpers.sendMessage(message.channelId, {
		content: value,
		messageReference: isReplyToBot
			? {
				messageId: message.id,
				channelId: message.channelId,
				guildId: message.guildId,
				failIfNotExists: false,
			}
			: undefined,
	}));

	if (!sent.ok) {
		console.error("    · markov: send failed:", sent.error.message);
	} else {
		console.log(`  · markov: sent "${value}"`);
	}

	return resetMarkovTrigger(state), Ok(undefined);
}

export async function reactionAdd(
	client: Client,
	reaction: Reaction,
): Promise<Result<void, AppError>> {
	if (!cfg("deepl")) return Ok(undefined);

	if (
		reaction.messageAuthorId !== getConfig().discord.client.applicationId ||
		!isTrackedChannel(reaction.channelId)
	) return Ok(undefined);

	if (reaction.emoji.name !== "❔") return Ok(undefined);

	const state = getState(reaction.channelId);
	const now = Date.now();
	const cooldownMs = cooldownFor(reaction.channelId);

	if (now - state.lastReactionTimestamp < cooldownMs) {
		console.log("  · markov(translate): reaction ignored (cooldown active).");
		return Ok(undefined);
	}
	state.lastReactionTimestamp = now;

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
		result = await translateOne(message.content, "PT-BR", params);
		if (!result.ok) return result;
		text = result.value.text;
		detectedSourceLang = result.value.detectedSourceLang;
	}

	text = applyReplacements(text, message.guildId);
	memory.set(message.id, { ...message, content: text });

	let requester = `snowflake(${reaction.userId})`;
	if (reaction.user?.username) requester = `@${reaction.user.username}, ${requester}`;

	console.log(`  · markov(translate): "${message.content}" → "${text}", requested by ${requester}`);

	const edited = tapError((e) => console.error("  · markov(translate): edit failed:", e))(
		await safePromise(
			client.helpers.editMessage(reaction.channelId, reaction.messageId, {
				content: text.toLowerCase(),
			}),
		),
	);

	return discard(edited) as Result<void, AppError>;
}
