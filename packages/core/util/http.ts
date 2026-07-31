/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type RetryOptions, withRetry } from "./retry.ts";
import { Errors, type NetworkError } from "../errors.ts";
import { err, ok, type Result } from "../result.ts";

export interface FetchOptions extends RequestInit {
	retry?: RetryOptions;
	mapError?: (e: unknown, status?: number, body?: string) => unknown;
}

const defaultMapError = (e: unknown): NetworkError =>
	Errors.network(e instanceof Error ? e.message : String(e));

export async function fetchWithRetry<T>(
	input: RequestInfo | URL,
	init?: FetchOptions & { json?: boolean },
): Promise<Result<T, unknown>> {
	const { retry, mapError = defaultMapError, json = true, ...fetchInit } = init ?? {};
	try {
		const response = await withRetry(
			() => fetch(input, fetchInit),
			retry ?? { maxAttempts: 3, baseDelayMs: 500 },
		);

		const text = await response.text();
		if (!response.ok) {
			const mapped = mapError(new Error(`HTTP ${response.status}`), response.status, text);
			return err(mapped);
		}

		try {
			return ok(JSON.parse(text) as T);
		} catch {
			if (json) {
				return err(Errors.network(`Invalid JSON response: ${JSON.stringify(text, null, 4)}}`));
			}
			return ok(text as T);
		}
	} catch (e) {
		return err(mapError(e));
	}
}
