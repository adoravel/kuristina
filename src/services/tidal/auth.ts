/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Fail, Ok, type Result, tryAsync } from "~/lib/result.ts";
import { Errors } from "~/lib/errors.ts";
import { TidalError } from "~/services/tidal/errors.ts";
import { sleep } from "~/lib/util/retry.ts";
import { SnakeCase } from "~/lib/util/types.ts";

export interface DeviceAuthResponse {
	deviceCode: string;
	userCode: string;
	verificationUri: string;
	verificationUriComplete?: string;
	expiresIn: number;
	interval: number;
}

export interface OAuthTokenResponse {
	accessToken: string;
	refreshToken: string;
	tokenType: string;
	expiresIn: number;
}

export interface SessionResponse {
	sessionId: string;
	userId: number;
	countryCode: string;
	channelId: number;
	partnerId: number;
}

const AUTH_BASE = "https://auth.tidal.com/v1/oauth2";

// tidal fire tv client bweh
export const FIRE_TV_ID = "7m7Ap0JC9j1cOM3n";
export const FIRE_TV_SECRET = "vRAdA108tlvkJpTsGZS8rGZ7xTlbJ0qaZ2K9saEzsgY=";
export const FIRE_TV_SCOPES = "r_usr w_usr";
export const FIRE_TV_UA = "TIDAL_ANDROID/1039 okhttp/3.14.9";

type AuthResult<T> = Result<T, TidalError>;

async function post<T>(
	path: string,
	body: Record<string, string>,
): Promise<AuthResult<T>> {
	const fetched = await tryAsync(
		() =>
			fetch(`${AUTH_BASE}${path}`, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams(body).toString(),
			}),
		(e) => Errors.network(e instanceof Error ? e.message : String(e)),
	);
	if (!fetched.ok) return fetched;

	const parsed = await tryAsync(
		() => fetched.value.json() as Promise<Record<string, unknown>>,
		() => Errors.network(`Auth HTTP ${fetched.value.status}: invalid JSON`),
	);

	if (!parsed.ok) return parsed;
	const response = fetched.value, json = parsed.value;

	if (!response.ok) {
		const error = json.error as string | undefined;
		const detail = json.error_description as string | undefined;

		if (error === "authorization_pending") {
			return Fail(Errors.tidal.auth("device_pending", "Waiting for user approval"));
		}
		if (error === "slow_down") return Fail(Errors.rateLimit(5_000));
		if (error === "expired_token") {
			return Fail(Errors.tidal.auth("device_expired", "Device code expired"));
		}
		if (response.status === 401) {
			return Fail(Errors.tidal.auth("refresh_failed", detail ?? "Unauthorised"));
		}

		return Fail(
			Errors.network(detail ?? `HTTP ${response.status}, ${error}: ${detail}`, response.status),
		);
	}

	return Ok(json as T);
}

export async function startDeviceAuth(): Promise<AuthResult<DeviceAuthResponse>> {
	const result = await post<DeviceAuthResponse>("/device_authorization", {
		scope: FIRE_TV_SCOPES,
		client_id: FIRE_TV_ID,
	});

	return result;
}

export async function pollForToken(
	deviceCode: string,
	intervalSeconds: number,
	maxWaitMs = 5 * 60 * 1_000,
): Promise<AuthResult<OAuthTokenResponse>> {
	const deadline = Date.now() + maxWaitMs;

	while (Date.now() < deadline) {
		await sleep(intervalSeconds * 1_000);

		const result = await post<SnakeCase<OAuthTokenResponse>>(
			"/token",
			{
				client_id: FIRE_TV_ID,
				client_secret: FIRE_TV_SECRET,
				device_code: deviceCode,
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				scope: FIRE_TV_SCOPES,
			},
		);

		if (!result.ok) {
			if (result.error.kind === "tidal/auth" && result.error.tag === "device_pending") {
				continue;
			}
			if (result.error.kind === "rate_limit") {
				await sleep(result.error.retryAfterMs ?? 1_000);
				continue;
			}
			return result;
		}

		const r = result.value;
		return Ok({
			accessToken: r.access_token,
			refreshToken: r.refresh_token,
			tokenType: r.token_type,
			expiresIn: r.expires_in,
		});
	}

	return Fail(Errors.tidal.auth("device_expired", "polling timed out"));
}

export async function refreshAccessToken(
	refreshToken: string,
): Promise<AuthResult<OAuthTokenResponse>> {
	const result = await post<SnakeCase<OAuthTokenResponse>>(
		"/token",
		{
			client_id: FIRE_TV_ID,
			client_secret: FIRE_TV_SECRET,
			refresh_token: refreshToken,
			grant_type: "refresh_token",
		},
	);

	if (!result.ok) {
		if (result.error.kind === "tidal/auth" || result.error.kind === "rate_limit") return result;
		return Fail(Errors.tidal.auth("refresh_failed", `${result.error.kind} ${result.error.tag}`));
	}

	const r = result.value;
	return Ok({
		accessToken: r.access_token,
		refreshToken: r.refresh_token ?? refreshToken,
		tokenType: r.token_type,
		expiresIn: r.expires_in,
	});
}
