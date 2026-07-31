/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { cfg, config } from "@kuristina/config";
import {
	Errors as CoreErrors,
	err,
	type FetchOptions,
	fetchWithRetry,
	ok,
	type Result,
} from "@kuristina/core";
import { createHash } from "node:crypto";
import { Errors, type LastFmApiError, type LastFmError } from "./errors.ts";

export const REQUEST_TIMEOUT_MS = 10_000;

export function isRetryableError(status?: number): boolean {
	return status === 429 || status === 503 || (status !== undefined && status >= 500);
}

export function mapLastFmError(error: unknown, status?: number): LastFmError {
	if (error && typeof error === "object" && "kind" in error) {
		return error as LastFmError;
	}
	const message = error instanceof Error ? error.message : String(error);
	return CoreErrors.network(message, status);
}

function md5(input: string): string {
	  return createHash("md5").update(input).digest("hex");
}

export async function request<T>(
	method: string,
	params: Record<string, string | number> = {},
	sessionKey?: string,
	signed?: boolean,
): Promise<Result<T, LastFmError>> {
	if (!cfg("lastfm") || !config.modules.lastfm.apiKey) {
		return err(
			Errors.auth("not_configured", "Last.fm module is not enabled or has no API key configured."),
		);
	}

	const { baseUrl, apiKey, secret } = config.modules.lastfm;

	const url = new URL(baseUrl);
	url.searchParams.set("method", method);
	url.searchParams.set("api_key", apiKey);
	url.searchParams.set("format", "json");

	const body: Record<string, string> = {};
	for (const [k, v] of Object.entries(params)) {
		body[k] = String(v);
	}

	if (sessionKey) {
		body.sk = sessionKey;
	}

	const isWriteMethod = signed || !!sessionKey;
	let requestBody: URLSearchParams | undefined;

	if (isWriteMethod) {
		const sortedEntries = Object.entries(body)
			.sort(([a], [b]) => a.localeCompare(b));
		const toSign = sortedEntries.map(([k, v]) => `${k}${v}`).join("");
		const sig = md5(toSign + secret);
		body.api_sig = sig;

		requestBody = new URLSearchParams(body);
	} else {
		for (const [k, v] of Object.entries(body)) {
			url.searchParams.set(k, v);
		}
	}

	const options: FetchOptions = {
		method: requestBody ? "POST" : "GET",
		body: requestBody,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		headers: {
			"User-Agent": `kuristina/0.1.0 (https://kyu.re/~kuristina)`,
			...(requestBody ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
		},
		retry: {
			maxAttempts: 4,
			baseDelayMs: 500,
			retryIf: (error) => {
				const status = (error as { status?: number })?.status;
				if (isRetryableError(status) || error instanceof TypeError) return true;

				return error instanceof DOMException && error.name === "TimeoutError";
			},
			onRetry: (attempt, delay) => console.warn(`  · lastfm: retry ${attempt}, waiting ${delay}ms`),
		},
	};

	const fetchUrl = requestBody ? url.toString() : url.toString();
	const result = await fetchWithRetry<string>(fetchUrl, options);

	if (!result.ok) {
		const networkError = result.error;
		const status = networkError.tag;
		if (status === 429) {
			return err(Errors.api(29, "Rate limit exceeded"));
		}
		if (status === 503 || (status && status >= 500)) {
			return err(Errors.api(16, "Service temporary error"));
		}
		return err(mapLastFmError(networkError, status));
	}

	const data = result.value;

	if (data && typeof data === "object" && "error" in data) {
		const errorData = data as { error: number; message: string };
		return err(Errors.api(errorData.error as LastFmApiError["tag"], errorData.message));
	}

	return ok(data as T);
}
