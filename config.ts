/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface BotConfig {
	readonly discord: {
		readonly token: string;
		readonly applicationId: string;
		readonly guildId: bigint;
	};
	readonly owner: {
		readonly id: bigint;
	};
	readonly emojis: {
		readonly success: string;
		readonly error: string;
		readonly loading: string;
	};
	readonly commands: {
		readonly defaultCooldown: number;
		readonly maxMentions: number;
	};
	readonly cache: {
		readonly contextTTL: number;
	};
}

export function loadConfig(): BotConfig {
	const getEnv = (key: string): string => {
		const value = Deno.env.get(key);
		if (!value && Deno.env.get("DENO_TEST") !== "1") {
			throw new Error(`Environment variable ${key} is not defined`);
		}
		return value ?? "";
	};

	return {
		discord: {
			token: getEnv("DISCORD_BOT_TOKEN"),
			applicationId: getEnv("DISCORD_APPLICATION_ID"),
			guildId: BigInt(getEnv("DISCORD_GUILD_ID")),
		},
		owner: {
			id: BigInt(getEnv("OWNER_ID")),
		},
		emojis: {
			success: Deno.env.get("EMOJI_SUCCESS") ||
				"<:bibooSip:1439478822163710064>",
			error: Deno.env.get("EMOJI_ERROR") || "<:bibooThink:1439478804501237850>",
			loading: Deno.env.get("EMOJI_LOADING") ||
				"<:bibooZzz:1439478767960588351>",
		},
		commands: {
			defaultCooldown: parseInt(Deno.env.get("DEFAULT_COOLDOWN") || "3000", 10),
			maxMentions: parseInt(Deno.env.get("MAX_MENTIONS") || "50", 10),
		},
		cache: {
			contextTTL: parseInt(Deno.env.get("CONTEXT_TTL") || "300000", 10),
		},
	};
}

let cachedConfig: BotConfig | null = null;

export default {
	get $(): BotConfig {
		if (!cachedConfig) {
			cachedConfig = loadConfig();
		}
		return cachedConfig;
	},
	get discord(): BotConfig["discord"] {
		return this.$.discord;
	},
	get owner(): BotConfig["owner"] {
		return this.$.owner;
	},
	get emojis(): BotConfig["emojis"] {
		return this.$.emojis;
	},
	get commands(): BotConfig["commands"] {
		return this.$.commands;
	},
	get cache(): BotConfig["cache"] {
		return this.$.cache;
	},
};
