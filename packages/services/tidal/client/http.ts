/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	err,
	type FetchOptions,
	fetchWithRetry,
	ok,
	type Result,
	withRetry,
} from "@kuristina/core";
import { Errors, type TidalApiErrorKind } from "../errors.ts";

import { isTransient, type TidalError } from "../errors.ts";
import { FIRE_TV_ID, FIRE_TV_UA } from "../auth.ts";
import { Errors as CoreErrors } from "@kuristina/errors";

const API_BASE = "https://api.tidal.com/v1";

export type TidalResult<T> = Result<T, TidalError>;

export interface TidalContext {
	readonly accessToken: string;
	readonly countryCode: string;
}

function isRetryableError(status?: number): boolean {
	return status === 429 || status === 503 || (status !== undefined && status >= 500);
}

function mapTidalError(error: unknown, status?: number): TidalError {
	if (error && typeof error === "object" && "kind" in error) {
		return error as TidalError;
	}

	if (status !== undefined) {
		switch (status) {
			case 401:
				return Errors.api(401, "Unauthorised");
			case 402:
				return Errors.api(402, "Subscription required");
			case 403:
				return Errors.api(403, "Forbidden");
			case 404:
				return Errors.api(404, "Not found");
			case 429:
				return Errors.api(429, "Rate limited");
		}
		if (status >= 500) {
			return Errors.api(status as 500, `Server error ${status}`);
		}
	}

	const message = error instanceof Error ? error.message : String(error);
	return CoreErrors.network(message, status) as TidalError;
}

async function get<T>(
	ctx: TidalContext,
	path: string,
	params?: Record<string, string | number>,
): Promise<TidalResult<T>> {
	const url = new URL(`${API_BASE}${path}`);
	for (const [k, v] of Object.entries(params ?? {})) {
		url.searchParams.set(k, String(v));
	}

	const options: FetchOptions = {
		method: "GET",
		headers: {
			"Authorization": `Bearer ${ctx.accessToken}`,
			"X-Tidal-Token": FIRE_TV_ID,
			"Accept-Encoding": "gzip",
			"User-Agent": FIRE_TV_UA,
		},
		retry: {
			maxAttempts: 4,
			baseDelayMs: 1_000,
			retryIf: (error) => {
				const status = (error as { status?: number })?.status;

				if (isRetryableError(status) || error instanceof TypeError) return true;
				return error instanceof DOMException && error.name === "TimeoutError";
			},
		},
	};

	const result = await fetchWithRetry<string>(url.toString(), options);

	if (!result.ok) {
		const networkError = result.error;
		const status = networkError.tag;
		if (status === 429) {
			return err(Errors.api(429, "Rate limited"));
		}
		if (status === 503) {
			return err(Errors.api(503, "Service unavailable"));
		}
		if (status !== undefined && status >= 500) {
			return err(Errors.api(status as 500, `Server error ${status}`));
		}
		return err(mapTidalError(networkError, status));
	}

	const data = result.value;

	if (data && typeof data === "object" && "error" in data) {
		const errorData = data as { error: { code: number; message: string } };
		const code = errorData.error.code as TidalApiErrorKind;
		const message = errorData.error.message;
		return err(Errors.api(code, message));
	}

	return ok(data as T);
}

function retrying<T>(fn: () => Promise<TidalResult<T>>): Promise<TidalResult<T>> {
	return withRetry(
		async () => {
			const r = await fn();
			if (!r.ok && isTransient(r.error)) throw r.error;
			return r;
		},
		{
			maxAttempts: 4,
			baseDelayMs: 1_000,
			retryIf: (e) => isTransient(e as TidalError),
		},
	);
}

export function tidal<T>(
	ctx: TidalContext,
	path: string,
	params?: Record<string, string | number>,
): Promise<TidalResult<T>> {
	return retrying<T>(() => get(ctx, path, params));
}
