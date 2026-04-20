/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { NetworkError, TaggedError } from "~/lib/errors.ts";

export type FmErrorKind =
	| 2 // invalid service
	| 3 // invalid method
	| 4 // authentication failed
	| 6 // invalid parameters / resource not found
	| 7 // invalid resource
	| 8 // operation failed (transient)
	| 9 // invalid session key
	| 10 // invalid API key
	| 11 // iervice offline (transient)
	| 13 // invalid method signature
	| 14 // this token has not been authorised
	| 15 // this token has expired
	| 16 // temporary error (transient)
	| 26 // suspended API key
	| 29; // rate limit exceeded (transient)

export type FmAuthErrorKind =
	| "no_session" // user has never authenticated
	| "session_expired" // session key rejected (code 9)
	| "token_expired" // pending OAuth token expired (code 15)
	| "token_not_found" // callback token not in pending store
	| "token_unauthorised"; // token exists but user hasn't approved yet (code 14)

export interface LastFmApiError extends TaggedError<"lastfm", FmErrorKind> {
	readonly message: string;
}

export interface LastFmAuthError extends TaggedError<"lastfm/auth", FmAuthErrorKind> {
	readonly message: string;
}

export type LastFmError = LastFmApiError | LastFmAuthError | NetworkError;

export const lastfm$Errors = {
	api: (code: FmErrorKind, message: string): LastFmApiError => ({
		kind: "lastfm",
		tag: code,
		message,
	}),

	auth: (reason: LastFmAuthError["tag"], message: string): LastFmAuthError => ({
		kind: "lastfm/auth",
		tag: reason,
		message,
	}),
} as const;

export function isTransient(e: LastFmError): boolean {
	if (e.kind === "network") return true;
	if (e.kind === "lastfm") return [8, 11, 16, 29].includes(e.tag);
	return false;
}

export function lastfm$describe(e: LastFmError): string | null {
	switch (e.kind) {
		case "lastfm":
			switch (e.tag) {
				case 4:
					return "Authentication failed, check your credentials.";
				case 6:
					return "Resource not found.";
				case 9:
					return "Session expired, please log in again.";
				case 10:
					return "Invalid API key.";
				case 14:
					return "Token not yet authorised. Please, approve the login link first.";
				case 15:
					return "Login link expired. Please try to log in again.";
				case 26:
					return "API key suspended.";
				case 29:
					return "Last.fm rate limit hit. Please try again in a moment.";
				default:
					return `Last.fm error (${e.tag}): ${e.message}`;
			}
		case "lastfm/auth":
			switch (e.tag) {
				case "no_session":
					return "You aren't linked to a Last.fm account. Use `/lastfm login`.";
				case "session_expired":
					return "Your session has expired. Use `/lastfm login` to re-authenticate.";
				case "token_expired":
					return "Your login link expired. Use `/lastfm login` to get a new one.";
				case "token_not_found":
					return "Unknown callback token. The link may have already been used.";
				case "token_unauthorised":
					return "You haven't approved the login yet — click the link and try again.";
				default:
					return null;
			}
		default:
			return null;
	}
}
