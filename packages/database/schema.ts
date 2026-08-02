/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { Generated, Kysely } from "@kysely/kysely";

export interface KuristinaSchema {
	schema_migrations: { version: number; applied_at: number };
	users: { user_id: Uint8Array; created_at: Generated<number> };
	markov_words: { word: string; count: Generated<number> };
	markov_chain: { id: Generated<number>; prefix: string; suffix: string; count: Generated<number> };
	tidal_sessions: {
		discord_id: Uint8Array;
		access_token: string;
		refresh_token: string;
		expires_at: number;
		country_code: string;
	};
	tidal_device_auth: { device_code: string; user_id: Uint8Array; created_at: number };
	scrobble_accounts: {
		id: Generated<number>;
		discord_id: Uint8Array;
		provider: string;
		username: string;
		is_default: Generated<number>;
		linked_at: number;
	};
	guild_members: {
		discord_id: Uint8Array;
		guild_id: Uint8Array;
		joined_at: number;
	};
	icon_emojis: {
		name: string;
		emoji_id: string;
		animated: Generated<number>;
		source_hash: string;
		uploaded_at: number;
	};
	bot_state: { key: string; value: string };
	music_link_cache: { source_url: string; payload: string; cached_at: number };
	message_companions: {
		source_message_id: string;
		response_message_id: string;
		channel_id: string;
		kind: string;
		created_at: number;
	};
}

export type SchemaContext = Kysely<KuristinaSchema>;

export * from "@db/sqlite";
export { sql } from "@kysely/kysely";
