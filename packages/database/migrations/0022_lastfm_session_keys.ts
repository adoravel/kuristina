/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema.alterTable("scrobble_accounts")
		.addColumn("session_key", "text").execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.alterTable("scrobble_accounts").dropColumn("session_key").execute();
}
