/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import { registerPurgeTask } from "./maintenance.ts";
import { repositories } from "./repository/mod.ts";

export function registerDefaultPurgeTasks(): void {
	registerPurgeTask(
		"external_cache",
		() => repositories.cache.purgeExpired(config.sqlite.musicLinkCacheTtlSeconds),
	);
	registerPurgeTask(
		"message_companions",
		() => repositories.messageCompanions.purgeOlderThan(config.sqlite.companionRetentionSeconds),
	);
	registerPurgeTask(
		"lastfm_response_cache",
		() => repositories.lastfmCache.purgeExpired(config.modules.lastfm.cacheTtlSeconds),
	);
}
