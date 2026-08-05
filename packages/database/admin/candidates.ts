/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export const ADMIN_EDITABLE_TABLES = new Set(
	[
		"markov_words",
		"markov_chain",
		"artist_aliases",
		"artist_alias_groups",
		"music_link_cache",
		"lastfm_response_cache",
	] as const,
);

export type AdminEditableTable = typeof ADMIN_EDITABLE_TABLES extends Set<infer T> ? T : never;

export function assertEditable(table: string): asserts table is AdminEditableTable {
	if (!ADMIN_EDITABLE_TABLES.has(table as AdminEditableTable)) {
		throw new Error(`"${table}" isn't in the admin-editable allowlist`);
	}
}
