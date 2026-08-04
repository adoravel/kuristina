/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema.alterTable("message_companions").addColumn("source_url", "text").execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.alterTable("message_companions").dropColumn("source_url").execute();
}
