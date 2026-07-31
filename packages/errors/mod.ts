/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { Errors as core$Errors, type NetworkError, type RateLimitError } from "@kuristina/core";
import {
	describe as lastfm$describe,
	Errors as lastfm$Errors,
	type LastFmError,
} from "@kuristina/services/lastfm";
import {
	type ConfigError,
	describe as config$describe,
	Errors as config$Errors,
} from "@kuristina/config";
import {
	describe as tidal$describe,
	Errors as tidal$Errors,
	type TidalError,
} from "@kuristina/services/tidal";
import { Errors as sql$Errors, type SqlError } from "@kuristina/database";
import { type DeepLError, Errors as deepl$Errors } from "@kuristina/services/deepl";

export type AppError =
	| ConfigError
	| LastFmError
	| TidalError
	| RateLimitError
	| NetworkError
	| SqlError
	| DeepLError;

export const Errors = {
	...core$Errors,
	config: config$Errors,
	lastfm: lastfm$Errors,
	tidal: tidal$Errors,
	sql: sql$Errors,
	deepl: deepl$Errors,
} as const;

export function describe(e: AppError): string {
	switch (e.kind) {
		case "rate_limit":
			return e.retryAfterMs ? `Rate limited. Retry after ${e.retryAfterMs}ms` : "Rate limited";
		case "config":
			return config$describe(e);
		case "network":
			return e.tag ? `Network error ${e.tag}: ${e.message}` : `Network error: ${e.message}`;
		case "lastfm":
		case "lastfm/auth":
			return lastfm$describe(e);
		case "tidal":
		case "tidal/auth":
		case "tidal/link":
		case "tidal/download":
			return tidal$describe(e);
		case "sql":
			return e.cause ? `${e.message} (${e.cause})` : e.message;
		default:
			if (e && typeof e === "object") {
				const obj = e as unknown as Record<string, unknown>;
				if ("message" in obj && typeof obj.message === "string") {
					return `Unknown error: ${obj.message}`;
				}
				if ("name" in obj && typeof obj.name === "string") {
					return `Unknown error: ${obj.name}`;
				}
				return `Unknown error: ${JSON.stringify(obj, null, 4)}`;
			}
			return `Unknown error: ${String(e)}`;
	}
}
