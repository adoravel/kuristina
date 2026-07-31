/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { Formality, ModelType } from "./types.ts";

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

export function resolveFormality(input: string): Formality | undefined {
	return FORMALITY_ALIASES[input.toLowerCase()];
}

export function resolveModelType(input: string): ModelType | undefined {
	return MODEL_ALIASES[input.toLowerCase()];
}
