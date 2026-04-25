/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { OAuthTokenResponse } from "~/services/tidal/auth.ts";
import { distinct, sql } from "~/database/mod.ts";
import { decodeSnowflake, encodeSnowflake } from "~/database/helpers.ts";
import { SqlError } from "~/database/errors.ts";
import { flatMap, Ok, Result } from "~/lib/result.ts";

const DEVICE_TTL = 10 * 60;

export const now = (): number => Math.floor(Date.now() / 1_000);

export interface StoredTidalSession extends Omit<OAuthTokenResponse, "tokenType" | "expiresIn"> {
	expiresAt: number;
	countryCode: string;
}

export function readTidalSession(userId: bigint): Result<StoredTidalSession | null, SqlError> {
	return flatMap<[string, string, number, string] | undefined, StoredTidalSession | null, SqlError>(
		(row: [string, string, number, string] | undefined) => {
			if (!row) return Ok(null);
			const [accessToken, refreshToken, expiresAt, countryCode] = row;
			return Ok({ accessToken, refreshToken, countryCode, expiresAt });
		},
	)(
		distinct<[string, string, number, string]>(
			`SELECT access_token, refresh_token, expires_at, country_code
             FROM tidal_sessions WHERE discord_id = ?`,
			encodeSnowflake(userId),
		),
	);
}

export function writeTidalSession(
	discordId: bigint,
	creds: StoredTidalSession,
): Result<number, SqlError> {
	return sql(
		`INSERT INTO tidal_sessions (discord_id, access_token, refresh_token, expires_at, country_code)
        	VALUES (?, ?, ?, ?, ?)
        	ON CONFLICT(discord_id) DO UPDATE SET
        		access_token = excluded.access_token,
				refresh_token = excluded.refresh_token,
				expires_at = excluded.expires_at,
				country_code = excluded.country_code`,
		encodeSnowflake(discordId),
		creds.accessToken,
		creds.refreshToken,
		creds.expiresAt,
		creds.countryCode,
	);
}

export function purgeTidalSession(userId: bigint): Result<number, SqlError> {
	return sql(`DELETE FROM tidal_sessions WHERE user_id = ?`, encodeSnowflake(userId));
}

export function writePendingDeviceAuth(
	deviceCode: string,
	userId: bigint,
): Result<number, SqlError> {
	return sql(
		`INSERT OR REPLACE INTO tidal_device_auth (device_code, user_id, created_at) VALUES (?, ?, ?)`,
		deviceCode,
		encodeSnowflake(userId),
		now(),
	);
}

export function readPendingDeviceAuth(deviceCode: string): Result<bigint | null, SqlError> {
	const row = distinct<[Uint8Array, number]>(
		`SELECT user_id, created_at FROM tidal_device_auth WHERE device_code = ?`,
		deviceCode,
	);
	if (!row.ok) return row;
	if (!row.value) return Ok(null);

	const [userId, createdAt] = row.value;
	if (now() - createdAt > DEVICE_TTL) {
		deletePendingDeviceAuth(deviceCode);
		return Ok(null);
	}

	return Ok(decodeSnowflake(userId));
}

export function deletePendingDeviceAuth(deviceCode: string): Result<number, SqlError> {
	return sql(`DELETE FROM tidal_device_auth WHERE device_code = ?`, deviceCode);
}

export function pruneExpiredDeviceAuth(): Result<number, SqlError> {
	return sql(
		`DELETE FROM tidal_device_auth WHERE created_at < ?`,
		now() - DEVICE_TTL,
	);
}

export function isTidalSessionExpired(session: StoredTidalSession): boolean {
	return session.expiresAt !== 0 && now() >= session.expiresAt;
}
