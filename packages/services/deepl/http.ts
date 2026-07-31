/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { err, ok, type Result, withRetry } from "@kuristina/core";
import { Errors } from "./errors.ts";
import { cfg, getConfig } from "@kuristina/config";
import type { DeepLError } from "./errors.ts";
import type {
	SourceLang,
	SupportedLanguage,
	TargetLang,
	TranslateOptions,
	Translation,
	Usage,
} from "./types.ts";

const REQUEST_TIMEOUT_MS = 10_000;

const SOURCE_CODES: ReadonlySet<string> = new Set([
	"AR",
	"BG",
	"CS",
	"DA",
	"DE",
	"EL",
	"EN",
	"ES",
	"ET",
	"FI",
	"FR",
	"HU",
	"ID",
	"IT",
	"JA",
	"KO",
	"LT",
	"LV",
	"NB",
	"NL",
	"PL",
	"PT",
	"RO",
	"RU",
	"SK",
	"SL",
	"SV",
	"TR",
	"UK",
	"ZH",
	"HE",
	"VI",
]);

const TARGET_CODES: ReadonlySet<string> = new Set([
	...SOURCE_CODES,
	"EN-US",
	"EN-GB",
	"PT-BR",
	"PT-PT",
	"ZH-HANS",
	"ZH-HANT",
	"ES-419",
	"DE-CH",
	"FR-CA",
]);

export function isSupportedSourceLang(code: string): boolean {
	return SOURCE_CODES.has(code.toUpperCase());
}

export function isSupportedTargetLang(code: string): boolean {
	return TARGET_CODES.has(code.toUpperCase());
}

function baseUrl(): string {
	return getConfig().modules.deepl.baseUrl;
}

function apiKey(): string {
	return getConfig().modules.deepl.apiKey;
}

function assertConfigured(): DeepLError | null {
	if (!cfg("deepl")) return Errors.notConfigured();
	if (!apiKey()) return Errors.notConfigured();
	return null;
}

async function request<T>(
	method: "GET" | "POST",
	path: string,
	body?: URLSearchParams,
): Promise<Result<T, DeepLError>> {
	const error = assertConfigured();
	if (error) return err(error);

	try {
		const response = await withRetry(
			async () => {
				const response = await fetch(`${baseUrl()}${path}`, {
					method,
					headers: {
						"Authorization": `DeepL-Auth-Key ${apiKey()}`,
						...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
					},
					body,
					signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				});

				if (response.status === 429 || response.status === 503) {
					throw new DeepLRetryableError(response.status);
				}

				return response;
			},
			{
				retryIf: (e, attempt) => {
					if (
						!(e instanceof DeepLRetryableError) && !(e instanceof TypeError) &&
						!(e instanceof DOMException && e.name === "TimeoutError")
					) return false;
					return attempt < 3;
				},
				onRetry: (attempt, delay) =>
					console.warn(`  · deepl: retry ${attempt}, waiting ${delay}ms`),
			},
		);

		const text = await response.text();

		switch (response.status) {
			case 200:
			case 201:
			case 204:
				return ok(text.length ? JSON.parse(text) as T : undefined as T);
			case 400:
				return err(Errors.badRequest(text));
			case 403:
				return err(Errors.auth());
			case 413:
				return err(Errors.tooLarge());
			case 429:
				return err(Errors.rateLimited());
			case 456:
				return err(Errors.quotaExceeded());
			case 503:
				return err(Errors.unavailable());
			default:
				return err(Errors.unknown(response.status, text));
		}
	} catch (e) {
		if (e instanceof DeepLRetryableError) {
			return err(e.status === 429 ? Errors.rateLimited() : Errors.unavailable());
		}
		const message = e instanceof Error ? e.message : String(e);
		return err(Errors.unknown(0, `request failed: ${message}`));
	}
}

class DeepLRetryableError {
	constructor(readonly status: 429 | 503) {}
}

export async function translate(
	texts: string | string[],
	targetLang: TargetLang,
	opts: TranslateOptions = {},
): Promise<Result<Translation[], DeepLError>> {
	const params = new URLSearchParams({ target_lang: targetLang });

	for (const text of [texts].flat()) {
		params.append("text", text);
	}

	if (opts.sourceLang) params.set("source_lang", opts.sourceLang);
	if (opts.formality) params.set("formality", opts.formality);
	if (opts.tagHandling) params.set("tag_handling", opts.tagHandling);
	if (opts.splitSentences) params.set("split_sentences", opts.splitSentences);
	if (opts.glossaryId) params.set("glossary_id", opts.glossaryId);
	if (opts.context) params.set("context", opts.context);
	if (opts.modelType) params.set("model_type", opts.modelType);
	if (opts.preserveFormatting) params.set("preserve_formatting", "1");

	const result = await request<
		{ translations: { text: string; detected_source_language: string }[] }
	>(
		"POST",
		"/translate",
		params,
	);
	if (!result.ok) return result;

	return ok(result.value.translations.map((t) => ({
		text: t.text,
		detectedSourceLang: t.detected_source_language as SourceLang,
	})));
}

export async function translateOne(
	text: string,
	targetLang: TargetLang,
	opts: TranslateOptions = {},
): Promise<Result<Translation, DeepLError>> {
	const result = await translate([text], targetLang, opts);
	if (!result.ok) return result;
	return ok(result.value[0]);
}

export async function getUsage(): Promise<Result<Usage, DeepLError>> {
	const result = await request<{ character_count: number; character_limit: number }>(
		"GET",
		"/usage",
	);
	if (!result.ok) return result;

	const { character_count, character_limit } = result.value;
	return ok({
		characterCount: character_count,
		characterLimit: character_limit,
		fraction: character_limit > 0 ? character_count / character_limit : 0,
	});
}

export async function getLanguages(
	type: "source" | "target" = "target",
): Promise<Result<SupportedLanguage[], DeepLError>> {
	const params = new URLSearchParams({ type });
	const result = await request<{ language: string; name: string; supports_formality: boolean }[]>(
		"GET",
		`/languages?${params}`,
	);
	if (!result.ok) return result;

	return ok(result.value.map((l) => ({
		code: l.language,
		name: l.name,
		supportsFormality: l.supports_formality,
	})));
}
