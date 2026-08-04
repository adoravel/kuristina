/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Generated, Kysely } from "@kysely/kysely";

export interface KuristinaSchema {
	schema_migrations: { version: number; applied_at: number };
	users: { user_id: string; created_at: Generated<number> };
	markov_words: { word: string; count: Generated<number> };
	markov_chain: { id: Generated<number>; prefix: string; suffix: string; count: Generated<number> };
	scrobble_accounts: {
		id: Generated<number>;
		discord_id: string;
		provider: string;
		username: string;
		is_default: Generated<number>;
		linked_at: number;
	};
	guild_members: {
		discord_id: string;
		guild_id: string;
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
