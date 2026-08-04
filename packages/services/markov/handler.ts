/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { discard, ok, orAsync, type Result, safePromise } from "@kuristina/core";
import type { AppError } from "@kuristina/errors";

import { cfg, config } from "@kuristina/config";
import type { SqlError } from "@kuristina/database";
import { getTranslationProvider } from "@kuristina/services/translation";
import type { TranslateOptions } from "@kuristina/services/deepl";

import type { DiscordClient, Message, Reaction } from "@kuristina/discord-client";

import { applyReplacements } from "./replacements.ts";
import * as markov from "./consumer.ts";
import discord from "@kuristina/discord-bot";

const TRANSLATION_DEBOUNCE_MS = 10_000;
const { log } = markov;

interface ChannelState {
	messageCount: number;
	triggerThreshold: number;
	lastReplyAt: number;
	lastReactionAt: number;
}

const channelStates = new Map<bigint, ChannelState>();
const translationTimestamps = new Map<bigint, number>();

function getChannelState(channelId: bigint): ChannelState {
	const existing = channelStates.get(channelId);
	if (existing) return existing;

	const { min, max } = config.modules.markov.triggerThreshold;
	const state: ChannelState = {
		messageCount: 0,
		triggerThreshold: Math.floor(Math.random() * (max - min + 1)) + min,
		lastReplyAt: 0,
		lastReactionAt: 0,
	};
	channelStates.set(channelId, state);
	return state;
}

function resetTrigger(state: ChannelState): void {
	const { min, max } = config.modules.markov.triggerThreshold;
	state.messageCount = 0;
	state.triggerThreshold = Math.floor(Math.random() * (max - min + 1)) + min;
	log(`next message in ${state.triggerThreshold} messages`);
}

function getCooldown(channelId: bigint): number {
	const { cooldownMs, channelCooldowns } = config.modules.markov;
	return channelCooldowns[channelId.toString()] ?? cooldownMs;
}

function isTrackedChannel(channelId: bigint): boolean {
	return config.modules.markov.channelIds.includes(channelId);
}

const normalise = (input: string): string =>
	input.normalize("NFKC").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const matches = (input: string, pattern: RegExp): boolean => pattern.test(normalise(input));

async function produce(
	client: DiscordClient,
	message: Message,
): Promise<Result<void, SqlError>> {
	const isBotAuthor = message.author.id === config.discord.client.applicationId ||
		message.author.id === config.discord.applicationId;

	if (isBotAuthor) return ok(undefined);
	if (!isTrackedChannel(message.channelId)) return ok(undefined);

	const state = getChannelState(message.channelId);

	const learnResult = await markov.learn(message.content);
	if (!learnResult.ok) return learnResult;

	const isMentioned = message.mentions?.some(
		(m) => m.id === config.discord.client.applicationId,
	) ?? false;

	const isReplyToBot = isMentioned || matches(message.content, config.modules.markov.pattern);

	const now = Date.now();
	const cooldown = getCooldown(message.channelId);
	let shouldTrigger = ++state.messageCount >= state.triggerThreshold;

	if (!shouldTrigger && isReplyToBot) {
		if (now - state.lastReplyAt > cooldown) {
			log("valid reply detected");
			shouldTrigger = true;
			state.lastReplyAt = now;
		} else {
			log("reply ignored (cooldown active)");
			return ok(undefined);
		}
	}

	const { singleWordChance, urlConcatChance, urlOnlyChance } = config.modules.markov;

	let result: Result<string, SqlError>;

	if (Math.random() * 100 < singleWordChance) {
		log("generating single word...");
		result = await orAsync(await markov.sampleWord())(markov.generate);
	} else {
		log("triggering generation...");
		result = await markov.generate();
	}

	if (!result.ok) return result;
	log(`"${result.value}" -${state.triggerThreshold - state.messageCount}`);

	if (!shouldTrigger) {
		return ok(undefined);
	}

	let { value } = result;
	const roll = Math.random() * 1000;

	if (roll < urlConcatChance) {
		log("triggering url concat...");
		const urlResult = await markov.generate("https://");
		if (urlResult.ok) value += " " + urlResult.value;
	} else if (roll < urlOnlyChance) {
		log("triggering url only...");
		const urlResult = await markov.generate("https://");
		if (urlResult.ok) value = urlResult.value;
	} else {
		const genResult = await markov.generate();
		if (genResult.ok) value = genResult.value;
	}

	value = applyReplacements(value, message.guildId);

	await safePromise(client.helpers.triggerTypingIndicator(message.channelId));

	const sent = await safePromise(
		client.helpers.sendMessage(message.channelId, {
			content: value,
			messageReference: isReplyToBot
				? {
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId,
					failIfNotExists: false,
				}
				: undefined,
		}),
	);

	if (!sent.ok) {
		log(`send ✌️ failed: ${sent.error.message}`);
	} else {
		log(`markov: sent "${value}"`);
	}

	resetTrigger(state);
	return ok(undefined);
}

export function messageCreate(
	client: DiscordClient,
	message: Message,
): Promise<Result<void, SqlError>> {
	return produce(client, message);
}

export async function translateReactedMessage(
	client: DiscordClient,
	message: Message,
	reaction: Reaction,
): Promise<Result<void, AppError>> {
	if (!cfg("deepl")) return ok(undefined);

	const botId = config.discord.client.applicationId;
	if (reaction.messageAuthorId !== botId || !isTrackedChannel(reaction.channelId)) {
		return ok(undefined);
	}

	const translateEmoji = config.modules.markov.translationEmoji;
	if (reaction.emoji.name !== translateEmoji) return ok(undefined);

	const lastTranslated = translationTimestamps.get(reaction.messageId);
	if (lastTranslated && Date.now() - lastTranslated < TRANSLATION_DEBOUNCE_MS) {
		return ok(undefined);
	}

	const state = getChannelState(reaction.channelId);
	const now = Date.now();
	const cooldown = getCooldown(reaction.channelId);

	if (now - state.lastReactionAt < cooldown) {
		return ok(undefined);
	}

	state.lastReactionAt = now;
	translationTimestamps.set(reaction.messageId, now);

	const reactionCount = message.reactions?.find(
		(r) => r.emoji.name === translateEmoji,
	)?.count ?? 0;

	if (reactionCount > 1) {
		log(`skipping translation; ${reactionCount} reactions of this type exist`);
		return ok(undefined);
	}

	safePromise(
		discord.helpers.deleteUserReaction(
			reaction.channelId,
			reaction.messageId,
			reaction.userId,
			reaction.emoji.name ?? reaction.emoji.id,
		),
	).catch(() => {});

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

	const requester = reaction.user?.username
		? `@${reaction.user.username}, snowflake(${reaction.userId})`
		: `snowflake(${reaction.userId})`;

	log(`"${message.content}" → "${text}", requested by ${requester}`);

	const edited = await safePromise(
		client.helpers.editMessage(reaction.channelId, reaction.messageId, {
			content: text,
		}),
	);

	if (!edited.ok) {
		log("edit failed: " + edited.error.message);
	}

	return discard(edited) as Result<void, AppError>;
}
