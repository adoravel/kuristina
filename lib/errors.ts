/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { lastfm$describe, lastfm$Errors, LastFmError } from "~/lastfm/errors.ts";

export type AppError =
	| LastFmError
	| RateLimitError
	| NetworkError;

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

	...lastfm$Errors,
} as const;

export function describe(e: AppError): string {
	switch (e.kind) {
		case "rate_limit":
			return e.retryAfterMs ? `Rate limited. Retry after ${e.retryAfterMs}ms` : "Rate limited";
		case "network":
			return e.tag ? `Network error ${e.tag}: ${e.message}` : `Network error: ${e.message}`;
		default: {
			const value = lastfm$describe(e);
			if (!value) return `Unknown error: ${e}`;
			return value;
		}
	}
}
