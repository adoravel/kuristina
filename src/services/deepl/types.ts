/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// https://developers.deepl.com/docs/resources/supported-languages
export type SourceLang =
	| "DE"
	| "EN"
	| "ES"
	| "PT"
	| "ZH"
	| "RU";

export type TargetLang =
	| SourceLang
	| "EN-GB"
	| "EN-US"
	| "PT-BR"
	| "PT-PT"
	| "ZH-HANS"
	| "ZH-HANT";

export type Formality = "default" | "more" | "less" | "prefer_more" | "prefer_less";
export type TagHandling = "xml" | "html";
export type SplitSentences = "0" | "1" | "nonewlines";
export type ModelType = "prefer_quality_optimized" | "quality_optimized" | "latency_optimized";

export interface TranslateOptions {
	readonly sourceLang?: SourceLang;
	readonly formality?: Formality;
	readonly tagHandling?: TagHandling;
	readonly splitSentences?: SplitSentences;
	readonly preserveFormatting?: boolean;
	readonly glossaryId?: string;
	readonly modelType?: ModelType;
	readonly context?: string;
}

export interface Translation {
	readonly text: string;
	readonly detectedSourceLang: SourceLang;
}

export interface Usage {
	readonly characterCount: number;
	readonly characterLimit: number;
	/** 0–1 */
	readonly fraction: number;
}

export interface SupportedLanguage {
	readonly code: string;
	readonly name: string;
	readonly supportsFormality: boolean;
}
