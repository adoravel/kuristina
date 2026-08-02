/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { Result } from "@kuristina/core";
import { repositories, type SqlError } from "@kuristina/database";

import type { OAuthTokenResponse } from "./auth.ts";

const DEVICE_TTL = 10 * 60;

export const now = (): number => Math.floor(Date.now() / 1_000);

export interface StoredTidalSession extends Omit<OAuthTokenResponse, "tokenType" | "expiresIn"> {
	expiresAt: number;
	countryCode: string;
}

export async function readTidalSession(
	userId: bigint,
): Promise<Result<StoredTidalSession | null, SqlError>> {
	return await repositories.tidal.readSession(userId);
}

export async function writeTidalSession(
	discordId: bigint,
	creds: StoredTidalSession,
): Promise<Result<void, SqlError>> {
	return await repositories.tidal.writeSession(discordId, creds);
}

export async function purgeTidalSession(userId: bigint): Promise<Result<void, SqlError>> {
	return await repositories.tidal.purgeSession(userId);
}

export async function writePendingDeviceAuth(
	deviceCode: string,
	userId: bigint,
): Promise<Result<void, SqlError>> {
	return await repositories.tidal.writePendingDeviceAuth(deviceCode, userId);
}

export async function readPendingDeviceAuth(
	deviceCode: string,
): Promise<Result<bigint | null, SqlError>> {
	return await repositories.tidal.readPendingDeviceAuth(deviceCode, DEVICE_TTL);
}

export async function deletePendingDeviceAuth(deviceCode: string): Promise<Result<void, SqlError>> {
	return await repositories.tidal.deletePendingDeviceAuth(deviceCode);
}

export async function pruneExpiredDeviceAuth(): Promise<Result<number, SqlError>> {
	return await repositories.tidal.purgeExpiredDeviceAuth(DEVICE_TTL);
}

export function isTidalSessionExpired(session: StoredTidalSession): boolean {
	return session.expiresAt !== 0 && now() >= session.expiresAt;
}
