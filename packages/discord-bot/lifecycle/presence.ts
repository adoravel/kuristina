/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { repositories } from "@kuristina/database";
import { config } from "@kuristina/config";
import type discord from "../bot.ts";

async function collectMemberIds(bot: typeof discord, guildId: bigint): Promise<Set<bigint>> {
	const guild = await bot.cache.guilds.get(guildId);
	if (!guild?.members) {
		const members = await bot.gateway.requestMembers(guildId, { limit: 0, query: "" });
		return new Set(members.map(($) => BigInt($.user.id)));
	}
	return new Set(guild.members.keys());
}

export async function reconcileGuild(bot: typeof discord, guildId: bigint): Promise<void> {
	const memberIds = await collectMemberIds(bot, guildId);
	if (!memberIds.size) {
		console.warn(`  · presence: chunk for guild ${guildId} returned no members, skipping`);
		return;
	}
	const result = await repositories.members.reconcileGuild(guildId, memberIds);
	if (!result.ok) {
		console.error(`  · presence: reconciliation failed for guild ${guildId}:`, result.error);
		return;
	}
	console.log(
		`  · presence: guild ${guildId} reconciled (+${result.value.added} / -${result.value.removed})`,
	);
}

export async function reconcileAllGuilds(bot: typeof discord): Promise<void> {
	for await (const [guildId] of bot.cache.guilds.memory) {
		await reconcileGuild(bot, guildId);
	}
}

export function schedulePresenceReconciliation(bot: typeof discord): void {
	const intervalMs = config.presence.reconcileIntervalMs;
	if (intervalMs <= 0) return;

	setInterval(() => void reconcileAllGuilds(bot), intervalMs);
}
