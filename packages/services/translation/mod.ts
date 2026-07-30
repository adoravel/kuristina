/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { Result } from "@kuristina/core";

import {
	getUsage as deeplGetUsage,
	translate as deeplTranslate,
	translateOne as deeplTranslateOne,
} from "../deepl/mod.ts";
import type { TargetLang, TranslateOptions, Translation, Usage } from "../deepl/types.ts";
import type { DeepLError } from "../deepl/errors.ts";

export type TranslationProviderName = "deepl";

export interface TranslationProvider {
	readonly name: TranslationProviderName;
	translate(
		texts: string | string[],
		targetLang: TargetLang,
		opts?: TranslateOptions,
	): Promise<Result<Translation[], DeepLError>>;
	translateOne(
		text: string,
		targetLang: TargetLang,
		opts?: TranslateOptions,
	): Promise<Result<Translation, DeepLError>>;
	getUsage(): Promise<Result<Usage, DeepLError>>;
}

const deepl: TranslationProvider = {
	name: "deepl",
	translate: deeplTranslate,
	translateOne: deeplTranslateOne,
	getUsage: deeplGetUsage,
};

export function getTranslationProvider(): TranslationProvider {
	return deepl;
}

export { type TranslateOptions } from "../deepl/types.ts";
