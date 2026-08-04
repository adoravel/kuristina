/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type CommandContextKind = "guild" | "bot_dm" | "private_channel";

export interface ContextSource {
	readonly guildId?: bigint;
	readonly dm?: boolean;
}

export function classifyContext(source: ContextSource): CommandContextKind {
	if (source.guildId) return "guild";
	if (source.dm) return "bot_dm";
	return "private_channel";
}

export function isContextAllowed(
	allowed: readonly CommandContextKind[] | undefined,
	actual: CommandContextKind,
): boolean {
	if (!allowed || allowed.length === 0) return true;
	return allowed.includes(actual);
}
