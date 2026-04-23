/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { sql } from "~/sql/mod.ts";

export function importTidalSchema() {
	sql(`
		CREATE TABLE IF NOT EXISTS tidal_sessions (
			discord_id		BLOB PRIMARY KEY,
            access_token	TEXT NOT NULL,
            refresh_token	TEXT NOT NULL,
            expires_at		INTEGER NOT NULL,
            country_code	TEXT NOT NULL
		)

		CREATE TABLE IF NOT EXISTS tidal_device_auth (
			device_code TEXT PRIMARY KEY,
			user_id     BLOB NOT NULL,
			created_at  INTEGER NOT NULL
		);
	`);
}
