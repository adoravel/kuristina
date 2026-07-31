/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { ok, err, type Result, sleep } from "@kuristina/core";
import { config } from "@kuristina/config";

import { request } from "../http.ts";
import { Errors, type LastFmError } from "../errors.ts";

export interface LastFmAuthToken {
	token: string;
	authUrl: string;
}

export interface LastFmSession {
	sessionKey: string;
	username: string;
}

export async function getAuthToken(): Promise<Result<LastFmAuthToken, LastFmError>> {
	const result = await request<{ token: string }>("auth.gettoken", {}, undefined, false);
	if (!result.ok) return result;

	const token = result.value.token;
	const apiKey = config.modules.lastfm.apiKey;
	const authUrl = `https://www.last.fm/api/auth?api_key=${apiKey}&token=${token}`;

	return ok({ token, authUrl });
}

export async function getSessionKey(token: string): Promise<Result<LastFmSession, LastFmError>> {
	const result = await request<{ session: { key: string; name: string } }>(
		"auth.getsession",
		{ token },
		undefined,
		true,
	);
	if (!result.ok) return result;

	return ok({
		sessionKey: result.value.session.key,
		username: result.value.session.name,
	});
}

export async function pollForSession(
	token: string,
	timeoutMs = 5 * 60 * 1000,
	intervalMs = 2000,
): Promise<Result<LastFmSession, LastFmError>> {
	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		const result = await getSessionKey(token);
		if (result.ok) return result;

		if (result.error.kind === "lastfm" && result.error.tag !== 14) {
			return result;
		}

		await sleep(intervalMs);
	}

	return err(Errors.auth("token_expired", "Authentication timeout, please try again."));
}
