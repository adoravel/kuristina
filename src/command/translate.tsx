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

function precisionLabel(
	inputLength: number,
	forced: boolean,
): { label: string; note: string } {
	if (forced) {
		return { label: "N/A", note: "source language was forced, autodetection was not used" };
	}
	if (inputLength < PRECISION_THRESHOLDS.low) {
		return {
			label: "Low",
			note: "very short; pin down with `-from` if this looks wrong",
		};
	}
	if (inputLength < PRECISION_THRESHOLDS.medium) {
		return { label: "Medium", note: "short input, usually right but worth a second look" };
	}
	return { label: "High", note: "enough context to detect reliably" };
}

function formatUsage(characterCount: number, characterLimit: number, fraction: number): string {
	const pct = (fraction * 100).toFixed(2);
	return `${characterCount.toLocaleString()} / ${characterLimit.toLocaleString()} characters used this period (${pct}%)`;
}

export default defineCommand("translate", {
	to: optional(identifier),
	from: optional(identifier),
	formality: optional(identifier),
	model: optional(identifier),
	$: optional(greedyString),
}, async (ctx) => {
	const text = truncate(ctx.remaining?.trim() ?? "", 480);
	if (!text) {
		return void await ctx.error("give me something to translate first");
	}

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
	tuning.push(`${text.length} → ${translated.length} chars`);
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
			<TextDisplay>{text}</TextDisplay>
			<Section spacing={1}>
				<Subtext>↓{"  "}{formatLanguage(target)}</Subtext>
				<TextDisplay>{translated}</TextDisplay>
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
