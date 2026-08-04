/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const DISCORD_EPOCH = 1420070400000n;

export function computeSnowflakeTimestamp(id: bigint): number {
	return Number((id >> 22n) + DISCORD_EPOCH);
}
