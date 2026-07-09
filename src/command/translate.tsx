/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { optional } from "~/lib/combinators/constructions.ts";
import { greedyString, identifier } from "~/lib/combinators/primitives.ts";
import { defineCommand } from "~/lib/command/registry.tsx";
import {
	getUsage,
	isSupportedSourceLang,
	isSupportedTargetLang,
	translateOne,
} from "~/services/deepl/mod.ts";
import { Formality, ModelType, SourceLang, TargetLang } from "~/services/deepl/types.ts";
import { describe } from "~/lib/errors.ts";
import { Card, Section, Subtext, TextDisplay } from "~/lib/ui";
import { formatLanguage } from "~/services/deepl/languages.ts";
import { Message } from "~/discord/types";
import { Bot } from "~/discord/bot";

const DISCORD_EMOJI_RE = /<a?:\w+:\d+>/g;
const UNICODE_EMOJI_RE =
	/\p{Extended_Pictographic}(?:\u200d\p{Extended_Pictographic})*[\uFE0F\u{1F3FB}-\u{1F3FF}]*/gu;

const DEFAULT_TARGET: TargetLang = "EN-GB";
const PRECISION_THRESHOLDS = { low: 8, medium: 25 } as const;

const FORMALITY_ALIASES: Record<string, Formality> = {
	default: "default",
	more: "more",
	formal: "more",
	less: "less",
	informal: "less",
	prefer_more: "prefer_more",
	"prefer-more": "prefer_more",
	prefer_less: "prefer_less",
	"prefer-less": "prefer_less",
};

const MODEL_ALIASES: Record<string, ModelType> = {
	quality: "quality_optimized",
	q: "quality_optimized",
	best: "quality_optimized",
	b: "quality_optimized",
	latency: "latency_optimized",
	l: "latency_optimized",
	fast: "latency_optimized",
	f: "latency_optimized",
	balanced: "prefer_quality_optimized",
	prefer_quality: "prefer_quality_optimized",
	pq: "prefer_quality_optimized",
	preferQuality: "prefer_quality_optimized",
};

function truncate(text: string, max: number): string {
	return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function stripEmoji(text: string): string {
	return text.replace(DISCORD_EMOJI_RE, "").replace(UNICODE_EMOJI_RE, "");
}

export function visibleLength(text: string): number {
	return [...stripEmoji(text)].length;
}

function quoteBlock(text: string): string {
	return text.split("\n").map((line) => `> ${line}`).join("\n");
}

async function getRepliedMessage(platform: Bot, message: Message): Promise<Message | undefined> {
	const ref = message.messageReference;
	if (!ref?.messageId) return undefined;

	try {
		return await platform.helpers.getMessage(message.channelId, ref.messageId);
	} catch {
		return undefined;
	}
}

async function getMentionedUsersLastMessages(platform: Bot, message: Message): Promise<string[]> {
	const mentions = message.mentions;
	if (!mentions?.length) return [];

	const messages = await platform.helpers.getMessages(message.channelId, { limit: 25 });

	const pendingMentions = new Map(mentions.map((m: any) => [m.id, m]));
	const results: string[] = [];

	for (const msg of messages) {
		const authorId = msg.author.id;

		if (pendingMentions.has(authorId)) {
			const content = msg.content.replace(/<@!?\d+>/g, "").trim();
			if (content) {
				results.push(`-# <@${msg.author.id}>\n${content}`);
			}
			pendingMentions.delete(authorId);
		}

		if (pendingMentions.size === 0) break;
	}

	return results;
}

export default defineCommand("translate", {
	to: optional(identifier),
	from: optional(identifier),
	formality: optional(identifier),
	model: optional(identifier),
	$: optional(greedyString),
}, async (ctx) => {
	let text = ctx.remaining?.trim() ?? "";

	if (!text || text.length < 3) {
		const replied = await getRepliedMessage(ctx.platform, ctx.message);
		if (replied?.content) {
			text = replied.content.trim();
		}
	}

	const clean = text.replace(/<@!?\d+>/g, "").trim();
	if (!clean || clean.length < 3) {
		const mentionedMessages = await getMentionedUsersLastMessages(ctx.platform, ctx.message);
		if (mentionedMessages.length) {
			text = mentionedMessages.join("\n\n");
		}
	}

	if (!text || text.length < 3) {
		return void await ctx.error("give me something to translate first, or reply to a message");
	}
	text = truncate(text, 480);

	const target = (ctx.args.to?.toUpperCase() ?? DEFAULT_TARGET) as TargetLang;
	const source = ctx.args.from?.toUpperCase() as SourceLang | undefined;

	if (!isSupportedTargetLang(target)) {
		return void await ctx.error(
			`"${target}" isn't a target language DeepL supports. Try e.g. \`EN-US\`, \`PT-BR\`, \`JA\`.`,
		);
	}
	if (source && !isSupportedSourceLang(source)) {
		return void await ctx.error(
			`"${source}" isn't a source language DeepL supports. Try e.g. \`EN\`, \`PT\`, \`JA\`.`,
		);
	}

	let formality: Formality | undefined;
	if (ctx.args.formality) {
		formality = FORMALITY_ALIASES[ctx.args.formality.toLowerCase()];
		if (!formality) {
			return void await ctx.error(
				`"${ctx.args.formality}" isn't a recognised formality. Try \`more\`, \`less\`, or \`default\`.`,
			);
		}
	}

	let modelType: ModelType | undefined;
	if (ctx.args.model) {
		modelType = MODEL_ALIASES[ctx.args.model.toLowerCase()];
		if (!modelType) {
			return void await ctx.error(
				`"${ctx.args.model}" isn't a recognised model. Try \`quality\`, \`latency\`, or \`balanced\`.`,
			);
		}
	}

	const [result, usage] = await Promise.all([
		translateOne(text, target, {
			sourceLang: source,
			formality,
			modelType,
			preserveFormatting: true,
		}),
		getUsage(),
	]);

	if (!result.ok) {
		return void await ctx.error(describe(result.error));
	}

	const { text: translated, detectedSourceLang } = result.value;

	const tuning: string[] = [];
	if (modelType) tuning.push(`model: ${modelType}`);
	if (formality) tuning.push(`formality: ${formality}`);
	if (ctx.message.messageReference && text.length <= 3) {
		tuning.push("from replied message");
	} else if (ctx.message.mentions?.length) {
		tuning.push(
			`from ${ctx.message.mentions.length} mentioned user${
				ctx.message.mentions.length > 1 ? "s" : ""
			}`,
		);
	} else {
		tuning.push("from command input");
	}
	if (usage.ok) {
		const { fraction, characterCount, characterLimit } = usage.value;
		const pct = (fraction * 100).toFixed(2);
		tuning.push(
			`${characterCount.toLocaleString()} / ${characterLimit.toLocaleString()} characters used this period (${pct}%)`,
		);
	}

	await ctx.reply(
		<Card>
			<Subtext>
				↑{"  "}{formatLanguage(source ?? detectedSourceLang)}
				{source ? " (forced)" : ""}
			</Subtext>
			<TextDisplay>{quoteBlock(text)}</TextDisplay>
			<Section spacing={1}>
				<Subtext>↓{"  "}{formatLanguage(target)}</Subtext>
				<TextDisplay>{quoteBlock(translated)}</TextDisplay>
			</Section>
			<Section spacing={1}>
				<Subtext>{tuning.join(" · ")}</Subtext>
			</Section>
		</Card>,
	);
}, {
	description:
		"Translates text via DeepL. `-to <lang>` sets the target (default EN-US), `-from <lang>` pins the source, `-formality <more|less>` and `-model <quality|prefer_quality|latency>` tune the translation.",
	category: "utility",
	cooldownMs: 3000,
});
