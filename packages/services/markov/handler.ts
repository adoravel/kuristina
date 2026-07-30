/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { discard, Ok, or, type Result, safePromise, tapError } from "@kuristina/core";
import { type AppError, TimedMap } from "@kuristina/core";

import { cfg, getConfig } from "@kuristina/config";
import type { SqlError } from "@kuristina/database";
import { getTranslationProvider } from "@kuristina/services/translation";
import type { TranslateOptions } from "@kuristina/services/deepl";

import type { DiscordClient, Message, Reaction } from "@kuristina/discord-client";

import { applyReplacements } from "./replacements.ts";

import * as markov from "./storage.ts";

type ChannelState = {
	chatMessageCount: number;
	chatTriggerThreshold: number;
	lastReplyTimestamp: number;
	lastReactionTimestamp: number;
};

const channelState = new Map<bigint, ChannelState>();

function getState(channelId: bigint): ChannelState {
	let state = channelState.get(channelId);
	const { triggerThreshold } = getConfig().modules.markov;

	if (!state) {
		channelState.set(
			channelId,
			state = {
				chatMessageCount: 0,
				chatTriggerThreshold:
					Math.floor(Math.random() * (triggerThreshold.max - triggerThreshold.min + 1)) +
					triggerThreshold.min,
				lastReplyTimestamp: 0,
				lastReactionTimestamp: 0,
			},
		);
	}
	return state;
}

const memory = new TimedMap<bigint, Message>(1.8e6); // 30 min
const messageLastTranslated = new Map<bigint, number>();

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

export async function messageCreate(
	client: DiscordClient,
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

	const learnt = await markov.learn(message.content);
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
	let result: Result<string, SqlError> | undefined;

	if (Math.random() * 100 < singleWordChance) {
		console.log("  · markov: generating single word...");
		result = or<string, SqlError>(await markov.generate())(
			tapError<string, SqlError>((e) => {
				console.log("  · failed to generate single word:", e);
			})(await markov.sampleWord()),
		);
	} else {
		console.log(`  · markov: triggering generation...`);
		result = tapError<string, SqlError>(console.error)(await markov.generate());
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
		result = await markov.generate("https://");
		if (result.ok) value += " " + result.value;
	} else if (roll < urlOnlyChance) {
		console.log(`  · markov: triggering url only...`);
		result = await markov.generate("https://");
		if (result.ok) value = result.value;
	} else {
		result = await markov.generate();
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
	client: DiscordClient,
	reaction: Reaction,
): Promise<Result<void, AppError>> {
	if (!cfg("deepl")) return Ok(undefined);

	if (
		reaction.messageAuthorId !== getConfig().discord.client.applicationId ||
		!isTrackedChannel(reaction.channelId)
	) return Ok(undefined);

	const translateEmoji = getConfig().modules.markov.translationEmoji;
	if (reaction.emoji.name !== translateEmoji) return Ok(undefined);

	const lastTranslated = messageLastTranslated.get(reaction.messageId);
	if (lastTranslated && (Date.now() - lastTranslated) < 10_000) {
		console.log(`  · markov(translate): message was recently translated, skipping...`);
		return Ok(undefined);
	}

	const state = getState(reaction.channelId);
	const now = Date.now();
	const cooldownMs = cooldownFor(reaction.channelId);

	if (now - state.lastReactionTimestamp < cooldownMs) {
		console.log("  · markov(translate): reaction ignored (cooldown active).");
		return Ok(undefined);
	}
	state.lastReactionTimestamp = now;
	messageLastTranslated.set(reaction.messageId, Date.now());

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
	const provider = getTranslationProvider();
	let result = await provider.translateOne(message.content, "EN", params);
	if (!result.ok) return result;

	let { text, detectedSourceLang } = result.value;

	if (detectedSourceLang.startsWith("EN")) {
		result = await provider.translateOne(message.content, "PT-BR", params);
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

const isTrackedChannel = (channelId: bigint) =>
	getConfig().modules.markov.channelIds.includes(channelId);

const stripDiacritics = (input: string) => input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
