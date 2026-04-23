/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NetworkError, RateLimitError, TaggedError } from "~/lib/errors.ts";

export type TidalApiErrorKind =
	| 401 // unauthorised, session expired or invalid
	| 402 // payment required; content needs subscription
	| 403 // forbidden; no access to this content
	| 404 // not found
	| 429 // rate limited
	| 500 // internal server error (transient)
	| 503; // service unavailable (transient)

export type TidalAuthErrorKind =
	| "no_credentials"
	| "token_expired"
	| "device_pending"
	| "device_expired"
	| "refresh_failed";

export type TidalDownloadErrorKind =
	| "unsupported_format"
	| "empty_manifest"
	| "ffmpeg_not_found"
	| "ffmpeg_failed"
	| "write_failed";

export type TidalLinkErrorKind =
	| "unrecognised"
	| "unsupported";

export interface TidalApiError extends TaggedError<"tidal", TidalApiErrorKind> {
	readonly message: string;
}

export interface TidalAuthError extends TaggedError<"tidal/auth", TidalAuthErrorKind> {
	readonly message: string;
}

export interface TidalDownloadError extends TaggedError<"tidal/download", TidalDownloadErrorKind> {
	readonly message: string;
}

export interface TidalLinkError extends TaggedError<"tidal/link", TidalLinkErrorKind> {
	readonly input: string;
}

export type TidalError =
	| TidalApiError
	| TidalAuthError
	| TidalDownloadError
	| TidalLinkError
	| NetworkError
	| RateLimitError;

export const tidal$Errors = {
	api: (code: TidalApiErrorKind, message: string): TidalApiError => ({
		kind: "tidal",
		tag: code,
		message,
	}),

	auth: (reason: TidalAuthErrorKind, message: string): TidalAuthError => ({
		kind: "tidal/auth",
		tag: reason,
		message,
	}),

	download: (reason: TidalDownloadErrorKind, message: string): TidalDownloadError => ({
		kind: "tidal/download",
		tag: reason,
		message,
	}),

	link: (reason: TidalLinkErrorKind, input: string): TidalLinkError => ({
		kind: "tidal/link",
		tag: reason,
		input,
	}),
} as const;

export function isTransient(e: TidalError): boolean {
	if (e.kind === "network") return true;
	if (e.kind === "tidal") return [429, 500, 503].includes(e.tag);
	return false;
}

export function tidal$describe(e: TidalError): string {
	switch (e.kind) {
		case "tidal":
			switch (e.tag) {
				case 401:
					return "Tidal session expired. Use `/tidal login` to re-authenticate.";
				case 402:
					return "This content requires a Tidal subscription.";
				case 403:
					return "You don't have access to this content.";
				case 404:
					return "Track, album, or playlist not found.";
				case 429:
					return "Tidal rate limit hit. Please try again in a moment.";
				default:
					return `Tidal API error (${e.tag}): ${e.message}`;
			}
		case "tidal/auth":
			switch (e.tag) {
				case "no_credentials":
					return "Not logged in to Tidal. Use `/tidal login`.";
				case "token_expired":
					return "Tidal session expired. Use `/tidal login` to re-authenticate.";
				case "device_pending":
					return "Waiting for device approval; visit the link and try again.";
				case "device_expired":
					return "Login window expired. Use `/tidal login` to start again.";
				case "refresh_failed":
					return "Couldn't refresh your Tidal session. Use `/tidal login`.";
				default:
					return "Unknown Tidal authentication error.";
			}
		case "tidal/download":
			switch (e.tag) {
				case "ffmpeg_not_found":
					return "FFmpeg is not installed.";
				case "ffmpeg_failed":
					return `Audio processing failed: ${e.message}`;
				default:
					return `Download failed: ${e.message}`;
			}
		case "tidal/link":
			return e.tag === "unsupported"
				? `Unrecognised Tidal link format: \`${e.input}\``
				: `Not a Tidal link: \`${e.input}\``;
		default:
			return "Unknown Tidal error";
	}
}
