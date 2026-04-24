/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { TaggedError } from "~/lib/errors.ts";

export type DeepLErrorKind =
	| "not_configured" // module disabled or no API key
	| "auth" // 403
	| "quota_exceeded" // 456
	| "too_large" // 413
	| "bad_request" // 400
	| "unavailable" // 503
	| "rate_limited" // 429, only surfaces if retries exhausted
	| "unknown";

export interface DeepLError extends TaggedError<"deepl", DeepLErrorKind> {
	readonly message: string;
	readonly status?: number;
}

export const deepl$Errors = {
	notConfigured: (): DeepLError => ({
		kind: "deepl",
		tag: "not_configured",
		message: "DeepL module is not enabled or has no API key configured.",
	}),

	auth: (): DeepLError => ({
		kind: "deepl",
		tag: "auth",
		message: "DeepL authentication failed. Check your API key.",
		status: 403,
	}),

	quotaExceeded: (): DeepLError => ({
		kind: "deepl",
		tag: "quota_exceeded",
		message: "DeepL character quota has been exhausted for this billing period.",
		status: 456,
	}),

	tooLarge: (): DeepLError => ({
		kind: "deepl",
		tag: "too_large",
		message: "Request payload exceeds DeepL's size limit.",
		status: 413,
	}),

	badRequest: (detail: string): DeepLError => ({
		kind: "deepl",
		tag: "bad_request",
		message: `Bad request: ${detail}`,
		status: 400,
	}),

	unavailable: (): DeepLError => ({
		kind: "deepl",
		tag: "unavailable",
		message: "DeepL service is temporarily unavailable.",
		status: 503,
	}),

	rateLimited: (): DeepLError => ({
		kind: "deepl",
		tag: "rate_limited",
		message: "DeepL rate limit hit and retries exhausted.",
		status: 429,
	}),

	unknown: (status: number, body: string): DeepLError => ({
		kind: "deepl",
		tag: "unknown",
		message: `Unexpected DeepL response ${status}: ${body}`,
		status,
	}),
} as const;
