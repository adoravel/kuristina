/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

// https://developers.deepl.com/docs/resources/supported-languages

export type SourceLang =
	| "AR"
	| "BG"
	| "CS"
	| "DA"
	| "DE"
	| "EL"
	| "EN"
	| "ES"
	| "ET"
	| "FI"
	| "FR"
	| "HU"
	| "ID"
	| "IT"
	| "JA"
	| "KO"
	| "LT"
	| "LV"
	| "NB"
	| "NL"
	| "PL"
	| "PT"
	| "RO"
	| "RU"
	| "SK"
	| "SL"
	| "SV"
	| "TR"
	| "UK"
	| "ZH"
	| "HE"
	| "VI";

export type TargetOnlyLang =
	| "EN-US"
	| "EN-GB"
	| "PT-BR"
	| "PT-PT"
	| "ZH-HANS"
	| "ZH-HANT"
	| "ES-419"
	| "DE-CH"
	| "FR-CA";

export type TargetLang = SourceLang | TargetOnlyLang;

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
