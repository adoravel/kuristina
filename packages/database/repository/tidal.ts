/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { decodeSnowflake, encodeSnowflake, type SqlError, tryQuery } from "@kuristina/database";
import type { StoredTidalSession } from "@kuristina/services/tidal";

import { Repository } from "./helper.ts";

export class TidalRepository extends Repository {
	async readSession(userId: bigint): Promise<Result<StoredTidalSession | null, SqlError>> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("tidal_sessions")
				.select(["access_token", "refresh_token", "expires_at", "country_code"])
				.where("discord_id", "=", encodeSnowflake(userId) as any)
				.executeTakeFirst();
			if (!row) return null;
			return {
				accessToken: row.access_token,
				refreshToken: row.refresh_token,
				expiresAt: row.expires_at,
				countryCode: row.country_code,
			};
		});
	}

	async writeSession(
		discordId: bigint,
		creds: StoredTidalSession,
	): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("tidal_sessions")
				.values({
					discord_id: encodeSnowflake(discordId) as any,
					access_token: creds.accessToken,
					refresh_token: creds.refreshToken,
					expires_at: creds.expiresAt,
					country_code: creds.countryCode,
				})
				.onConflict((oc) =>
					oc.column("discord_id").doUpdateSet((eb) => ({
						access_token: eb.ref("excluded.access_token"),
						refresh_token: eb.ref("excluded.refresh_token"),
						expires_at: eb.ref("excluded.expires_at"),
						country_code: eb.ref("excluded.country_code"),
					}))
				)
				.execute()
		).then((r) => r.ok ? ok(undefined) : r);
	}

	async purgeSession(userId: bigint): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.deleteFrom("tidal_sessions").where(
				"discord_id",
				"=",
				encodeSnowflake(userId) as any,
			).execute()
		).then((r) => r.ok ? ok(undefined) : r);
	}

	async writePendingDeviceAuth(
		deviceCode: string,
		userId: bigint,
	): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("tidal_device_auth")
				.values({
					device_code: deviceCode,
					user_id: encodeSnowflake(userId) as any,
					created_at: Math.floor(Date.now() / 1000),
				})
				.onConflict((oc) =>
					oc.column("device_code").doUpdateSet((eb) => ({
						user_id: eb.ref("excluded.user_id"),
						created_at: eb.ref("excluded.created_at"),
					}))
				)
				.execute()
		).then((r) => r.ok ? ok(undefined) : r);
	}

	async readPendingDeviceAuth(
		deviceCode: string,
		ttlSeconds: number,
	): Promise<Result<bigint | null, SqlError>> {
		return await tryQuery(async () => {
			const row = await this.database.selectFrom("tidal_device_auth")
				.select(["user_id", "created_at"]).where("device_code", "=", deviceCode).executeTakeFirst();
			if (!row) return null;
			if (Math.floor(Date.now() / 1000) - row.created_at > ttlSeconds) {
				await this.deletePendingDeviceAuth(deviceCode);
				return null;
			}
			return decodeSnowflake(row.user_id as Uint8Array);
		});
	}

	async deletePendingDeviceAuth(deviceCode: string): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.deleteFrom("tidal_device_auth").where("device_code", "=", deviceCode).execute()
		).then((r) => r.ok ? ok(undefined) : r);
	}

	async purgeExpiredDeviceAuth(ttlSeconds: number): Promise<Result<number, SqlError>> {
		return await tryQuery(async () => {
			const cutoff = Math.floor(Date.now() / 1000) - ttlSeconds;
			const result = await this.database.deleteFrom("tidal_device_auth")
				.where("created_at", "<", cutoff).executeTakeFirst();
			return Number(result.numDeletedRows ?? 0n);
		});
	}
}

export const tidalRepository = new TidalRepository();
