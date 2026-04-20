/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { lastfm$describe, lastfm$Errors, LastFmError } from "~/lastfm/errors.ts";
import { config$describe, config$Errors, ConfigError } from "~/config/errors.ts";
import { tidal$describe, tidal$Errors, TidalError } from "~/tidal/errors.ts";
import { sql$Errors, SqlError } from "~/sql/errors.ts";

export type AppError =
	| ConfigError
	| LastFmError
	| TidalError
	| RateLimitError
	| NetworkError
	| SqlError;

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
			return e.message;
		default:
			return `Unknown error: ${e}`;
	}
}
