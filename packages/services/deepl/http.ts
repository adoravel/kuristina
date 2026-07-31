/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { err, type FetchOptions, fetchWithRetry, ok, type Result } from "@kuristina/core";
import { type DeepLError, Errors } from "./errors.ts";
import { cfg, config } from "@kuristina/config";
import type {
	SourceLang,
	SupportedLanguage,
	TargetLang,
	TranslateOptions,
	Translation,
	Usage,
} from "./types.ts";

const REQUEST_TIMEOUT_MS = 10_000;

// deno-fmt-ignore
const SOURCE_CODES: ReadonlySet<string> = new Set([
	"AR", "BG", "CS", "DA", "DE", "EL", "EN", "ES", "ET", "FI", "FR", "HU",
	"ID", "IT", "JA", "KO", "LT", "LV", "NB", "NL", "PL", "PT", "RO", "RU",
	"SK", "SL", "SV", "TR", "UK", "ZH", "HE", "VI",
]);

// deno-fmt-ignore
const TARGET_CODES: ReadonlySet<string> = new Set([
	...SOURCE_CODES,
	"EN-US", "EN-GB", "PT-BR", "PT-PT", "ZH-HANS", "ZH-HANT", "ES-419",
	"DE-CH", "FR-CA",
]);

export function isSupportedSourceLang(code: string): boolean {
	return SOURCE_CODES.has(code.toUpperCase());
}

export function isSupportedTargetLang(code: string): boolean {
	return TARGET_CODES.has(code.toUpperCase());
}

function isRetryableError(status?: number): boolean {
	return status === 429 || status === 503 || (status !== undefined && status >= 500);
}

async function request<T>(
	method: "GET" | "POST",
	path: string,
	body?: URLSearchParams,
): Promise<Result<T, DeepLError>> {
	if (!cfg("deepl")) {
		return err(Errors.notConfigured());
	}

	const key = config.modules.deepl.apiKey;
	if (!key) {
		return err(Errors.notConfigured());
	}

	const url = `${config.modules.deepl.baseUrl}${path}`;
	const headers: HeadersInit = {
		"Authorization": `DeepL-Auth-Key ${key}`,
	};
	if (body) {
		headers["Content-Type"] = "application/x-www-form-urlencoded";
	}

	const options: FetchOptions = {
		method,
		headers,
		body,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		retry: {
			maxAttempts: 4,
			baseDelayMs: 500,
			retryIf: (error) => {
				const status = (error as { status?: number })?.status;

				if (isRetryableError(status) || error instanceof TypeError) return true;
				return error instanceof DOMException && error.name === "TimeoutError";
			},
			onRetry: (attempt, delay) => console.warn(`  · deepl: retry ${attempt}, waiting ${delay}ms`),
		},
	};

	const result = await fetchWithRetry<string>(url, options);

	if (!result.ok) {
		const networkError = result.error;
		if (networkError.tag === 429) {
			return err(Errors.rateLimited());
		}
		if (networkError.tag === 503) {
			return err(Errors.unavailable());
		}
		return err(Errors.unknown(0, networkError.message));
	}

	const data = result.value;

	if (data && typeof data === "object" && "message" in data) {
		return handleDeepLError(data);
	} else if (data && typeof data === "object") {
		return ok(data as T);
	}

	return err(Errors.unknown(0, `Unexpected response format: ${JSON.stringify(data, null, 4)}`));
}

function handleDeepLError(data: unknown): Result<never, DeepLError> {
	const errorData = data as { message?: string; error?: string; detail?: string };
	const errorMessage = errorData.message ?? errorData.error ?? errorData.detail ?? "Unknown error";

	const msg = errorMessage.toLowerCase();
	if (msg.includes("authentication") || msg.includes("auth") || msg.includes("invalid key")) {
		return err(Errors.auth());
	}
	if (msg.includes("quota") || msg.includes("exceeded") || msg.includes("limit")) {
		return err(Errors.quotaExceeded());
	}
	if (msg.includes("too large") || msg.includes("payload") || msg.includes("size")) {
		return err(Errors.tooLarge());
	}
	if (msg.includes("rate") || msg.includes("too many")) {
		return err(Errors.rateLimited());
	}
	if (msg.includes("unavailable") || msg.includes("temporary")) {
		return err(Errors.unavailable());
	}

	return err(Errors.badRequest(errorMessage));
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
