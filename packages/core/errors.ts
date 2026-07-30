/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

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

export interface BaseError<Kind> {
	readonly kind: Kind;
}

export interface TaggedError<Kind, Code> extends BaseError<Kind> {
	readonly tag: Code;
}

export interface RateLimitError extends BaseError<"rate_limit"> {
	readonly retryAfterMs?: number;
}

export interface NetworkError extends TaggedError<"network", number | undefined> {
	readonly message: string;
}

export const Errors = {
	rateLimit: (retryAfterMs?: number): RateLimitError => ({
		kind: "rate_limit",
		retryAfterMs,
	}),

	network: (message: string, status?: number): NetworkError => ({
		kind: "network",
		message,
		tag: status,
	}),

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
			return `Unknown error: ${e}`;
	}
}
