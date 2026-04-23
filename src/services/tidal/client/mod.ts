/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { isTransient, TidalError } from "~/services/tidal/errors.ts";
import { FIRE_TV_ID, FIRE_TV_UA } from "~/services/tidal/auth.ts";
import { Fail, Ok, type Result } from "~/lib/result.ts";
import { withRetry } from "~/lib/util/retry.ts";
import { Errors } from "~/lib/errors.ts";

const API_BASE = "https://api.tidal.com/v1";

export type TidalResult<T> = Result<T, TidalError>;

export interface TidalContext {
	readonly accessToken: string;
	readonly countryCode: string;
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

	let response: Response;
	try {
		response = await fetch(url, {
			headers: {
				"Authorization": `Bearer ${ctx.accessToken}`,
				"X-Tidal-Token": FIRE_TV_ID,
				"Accept-Encoding": "gzip",
				"User-Agent": FIRE_TV_UA,
			},
		});
	} catch (e) {
		return Fail(Errors.network(e instanceof Error ? e.message : String(e)));
	}

	if (!response.ok) {
		switch (response.status) {
			case 401:
				return Fail(Errors.tidal.api(401, "Unauthorised"));
			case 402:
				return Fail(Errors.tidal.api(402, "Subscription required"));
			case 403:
				return Fail(Errors.tidal.api(403, "Forbidden"));
			case 404:
				return Fail(Errors.tidal.api(404, "Not found"));
			case 429:
				return Fail(Errors.tidal.api(429, "Rate limited"));
		}
		if (response.status >= 500) {
			return Fail(Errors.tidal.api(response.status as 500, `Server error ${response.status}`));
		}
		return Fail(Errors.network(`HTTP ${response.status}`, response.status));
	}

	let json: T;
	try {
		json = await response.json();
	} catch {
		return Fail(Errors.network("Invalid JSON response"));
	}

	return Ok(json);
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
