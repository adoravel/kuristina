/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { cfg, config } from "@kuristina/config";
import { err, Errors as CoreErrors, fetchWithRetry, ok, type Result } from "@kuristina/core";
import { createHash } from "node:crypto";
import { Errors, type LastFmApiError, type LastFmError } from "./errors.ts";

export const REQUEST_TIMEOUT_MS = 10_000;

export function isRetryableError(status?: number): boolean {
	return status === 429 || status === 503 || (status !== undefined && status >= 500);
}

function mapLastFmError(e: unknown, status?: number, body?: string): LastFmError {
	if (e && typeof e === "object" && "kind" in e) {
		return e as LastFmError;
	}
	if (body) {
		try {
			const data = JSON.parse(body);
			if (data && typeof data === "object" && "error" in data) {
				const errorData = data as { error: number; message: string };
				return Errors.api(errorData.error as LastFmApiError["tag"], errorData.message);
			}
		} catch { /* no-op */ }
	}
	const message = e instanceof Error ? e.message : String(e);
	return CoreErrors.network(message, status) as LastFmError;
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

	const payload: Record<string, string> = {
		method,
		api_key: apiKey,
	};
	for (const [k, v] of Object.entries(params)) {
		payload[k] = String(v);
	}

	if (sessionKey) {
		payload.sk = sessionKey;
	}

	const isWriteMethod = signed || !!sessionKey;
	let body: URLSearchParams | undefined;

	if (isWriteMethod) {
		if (!secret) {
			return err(Errors.auth("not_configured", "Last.fm shared secret is not configured"));
		}
		const sortedEntries = Object.entries(payload)
			.filter(([k]) => k !== "format")
			.sort(([a], [b]) => a.localeCompare(b));

		const toSign = sortedEntries.map(([k, v]) => `${k}${v}`).join("");
		payload.api_sig = md5(toSign + secret);

		payload.format = "json";
		body = new URLSearchParams(payload);
	} else {
		payload.format = "json";
		for (const [k, v] of Object.entries(payload)) {
			url.searchParams.set(k, v);
		}
	}

	const result = await fetchWithRetry<string, LastFmError>(url.toString(), {
		method: body ? "POST" : "GET",
		body,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		headers: {
			"User-Agent": config.network.userAgent,
			...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
		},
		retry: {
			maxAttempts: 4,
			baseDelayMs: 500,
			retryIf: (error) => {
				const status = (error as { status?: number })?.status;
				return isRetryableError(status);
			},
			onRetry: (attempt, delay) => logger.warn(`lastfm: retry ${attempt}, waiting ${delay}ms`),
		},
		mapError: mapLastFmError,
		json: true,
	});

	if (!result.ok) {
		return err(result.error as LastFmError);
	}

	const data = result.value;

	if (data && typeof data === "object" && "error" in data) {
		const errorData = data as { error: number; message: string };
		return err(Errors.api(errorData.error as LastFmApiError["tag"], errorData.message));
	}

	return ok(data as T);
}
