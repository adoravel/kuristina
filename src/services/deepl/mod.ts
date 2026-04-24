import { Fail, Ok, type Result } from "~/lib/result.ts";
import { withRetry } from "~/lib/util/retry.ts";
import { cfg, getConfig } from "~/config/mod.ts";
import { type DeepLError } from "./errors.ts";
import type {
	SourceLang,
	SupportedLanguage,
	TargetLang,
	TranslateOptions,
	Translation,
	Usage,
} from "./types.ts";
import { Errors } from "~/lib/errors.ts";

function baseUrl(): string {
	return getConfig().modules.deepl.baseUrl;
}

function apiKey(): string {
	return getConfig().modules.deepl.apiKey;
}

function assertConfigured(): DeepLError | null {
	if (!cfg("deepl")) return Errors.deepl.notConfigured();
	if (!apiKey()) return Errors.deepl.notConfigured();
	return null;
}

async function request<T>(
	method: "GET" | "POST",
	path: string,
	body?: URLSearchParams,
): Promise<Result<T, DeepLError>> {
	const err = assertConfigured();
	if (err) return Fail(err);

	try {
		const response = await withRetry(
			() =>
				fetch(`${baseUrl()}${path}`, {
					method,
					headers: {
						"Authorization": `DeepL-Auth-Key ${apiKey()}`,
						...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
					},
					body,
				}),
			{
				retryIf: (e, attempt) => {
					if (e instanceof DeepLTerminalError) return false;
					return attempt < 3;
				},
				onRetry: (attempt, delay) =>
					console.warn(`  · deepl: retry ${attempt}, waiting ${delay}ms`),
			},
		).catch((e): never => {
			throw e instanceof DeepLTerminalError ? e.inner : e;
		});

		const text = await response.text();

		switch (response.status) {
			case 200:
			case 201:
			case 204:
				return Ok(text.length ? JSON.parse(text) as T : undefined as T);
			case 400:
				return Fail(Errors.deepl.badRequest(text));
			case 403:
				return Fail(Errors.deepl.auth());
			case 413:
				return Fail(Errors.deepl.tooLarge());
			case 429:
				return Fail(Errors.deepl.rateLimited());
			case 456:
				return Fail(Errors.deepl.quotaExceeded());
			case 503:
				return Fail(Errors.deepl.unavailable());
			default:
				return Fail(Errors.deepl.unknown(response.status, text));
		}
	} catch (e) {
		if (!(e instanceof DeepLTerminalError)) throw e;
		return Fail(Errors.deepl.unknown(e.inner.status ?? 0, e.inner.message));
	}
}

class DeepLTerminalError {
	constructor(readonly inner: DeepLError) {}
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

	return Ok(result.value.translations.map((t) => ({
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
	return Ok(result.value[0]);
}

export async function getUsage(): Promise<Result<Usage, DeepLError>> {
	const result = await request<{ character_count: number; character_limit: number }>(
		"GET",
		"/usage",
	);
	if (!result.ok) return result;

	const { character_count, character_limit } = result.value;
	return Ok({
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

	return Ok(result.value.map((l) => ({
		code: l.language,
		name: l.name,
		supportsFormality: l.supports_formality,
	})));
}
