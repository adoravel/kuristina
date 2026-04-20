/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { parse as parseToml } from "@std/toml";
import { Fail, Ok, type Result } from "~/lib/result.ts";
import { config$Errors, ConfigError } from "~/config/errors.ts";

const Errors = config$Errors;

export const DEFAULT_CONFIG_PATH = "config.toml";

export interface KuristinaConfig {
	readonly discord: {
		readonly token: string;
		readonly applicationId: bigint;
		readonly guildId: bigint;
	};
	readonly owner: {
		readonly id: bigint;
	};
	readonly sqlite: {
		path: string;
	};
	readonly emojis: {
		readonly success: string;
		readonly error: string;
		readonly loading: string;
	};
	readonly commands: {
		readonly defaultCooldownMs: number;
		readonly maxMentions: number;
	};
	readonly cache: {
		readonly contextTtlMs: number;
	};
}

const defaults: Partial<KuristinaConfig> = {
	emojis: {
		success: "✅",
		error: "❌",
		loading: "⏳",
	},
	commands: {
		defaultCooldownMs: 3_000,
		maxMentions: 5,
	},
	cache: {
		contextTtlMs: 450_00,
	},
	sqlite: {
		path: "./data/kuristina.sqlite",
	},
} as const;

interface RawConfig {
	discord?: {
		token?: unknown;
		application_id?: unknown;
		guild_id?: unknown;
	};
	owner?: {
		id?: unknown;
	};
	sqlite?: {
		path: string;
	};
	emojis?: {
		success?: unknown;
		error?: unknown;
		loading?: unknown;
	};
	commands?: {
		default_cooldown_ms?: unknown;
		max_mentions?: unknown;
	};
	cache?: {
		context_ttl_ms?: unknown;
	};
}

interface FieldError {
	readonly path: string;
	readonly message: string;
}

function requireString(value: unknown, path: string, errors: FieldError[]): string | undefined {
	if (typeof value === "string" && value.trim().length) return value.trim();
	errors.push({
		path,
		message: value === undefined
			? "required field is missing"
			: `expected a non-empty string, got ${JSON.stringify(value)}`,
	});
	return undefined;
}

function requireSnowflake(value: unknown, path: string, errors: FieldError[]): bigint | undefined {
	const str = typeof value === "string"
		? value.trim()
		: typeof value === "number"
		? String(value)
		: undefined;

	if (!str) {
		errors.push({ path, message: "required field is missing" });
		return undefined;
	}

	if (Number.isSafeInteger(str)) {
		errors.push({ path, message: `not a valid snowflake: ${JSON.stringify(str)}` });
		return undefined;
	}

	try {
		return BigInt(str);
	} catch {
		errors.push({ path, message: `could not parse as bigint: ${JSON.stringify(str)}` });
		return undefined;
	}
}

function optionalString(value: unknown, fallback: string = ""): string {
	return typeof value === "string" && value.trim().length ? value.trim() : fallback;
}

function optionalPositiveInt(
	value: unknown,
	fallback: number,
	path: string,
	errors: FieldError[],
): number {
	if (value === undefined) return fallback;
	if (typeof value === "number" && Number.isInteger(value) && value) return value;
	errors.push({ path, message: `expected a positive integer, got ${JSON.stringify(value)}` });
	return fallback;
}

export function loadConfig(path = DEFAULT_CONFIG_PATH): Result<KuristinaConfig, ConfigError> {
	let text: string;
	try {
		text = Deno.readTextFileSync(path);
	} catch (e) {
		if (e instanceof Deno.errors.NotFound) {
			return Fail(
				Errors.notFound(
					`Config file not found at ${path}. Copy config.example.toml and fill in your values.`,
				),
			);
		}
		if (e instanceof Deno.errors.PermissionDenied) {
			return Fail(Errors.permissionDenied(`Cannot read config at ${path}`));
		}
		return Fail(Errors.parseFailed(path, e instanceof Error ? e.message : String(e)));
	}

	let raw: RawConfig;
	try {
		raw = parseToml(text) as RawConfig;
	} catch (e) {
		return Fail(
			Errors.parseFailed(
				path,
				`Invalid TOML in ${path}: ${e instanceof Error ? e.message : String(e)}`,
			),
		);
	}

	const errors: FieldError[] = [];

	const token = requireString(raw.discord?.token, "discord.token", errors);
	const applicationId = requireSnowflake(
		raw.discord?.application_id,
		"discord.application_id",
		errors,
	);
	const guildId = requireSnowflake(raw.discord?.guild_id, "discord.guild_id", errors);
	const ownerId = requireSnowflake(raw.owner?.id, "owner.id", errors);

	const defaultCooldownMs = optionalPositiveInt(
		raw.commands?.default_cooldown_ms,
		defaults.commands!.defaultCooldownMs,
		"commands.default_cooldown_ms",
		errors,
	);
	const maxMentions = optionalPositiveInt(
		raw.commands?.max_mentions,
		defaults.commands!.maxMentions,
		"commands.max_mentions",
		errors,
	);
	const contextTtlMs = optionalPositiveInt(
		raw.cache?.context_ttl_ms,
		defaults.cache!.contextTtlMs,
		"cache.context_ttl_ms",
		errors,
	);

	if (errors.length > 0) {
		const summary = errors
			.map((e) => `  • ${e.path}: ${e.message}`)
			.join("\n");
		return Fail(
			Errors.parseFailed(
				path,
				`config validation failed (${errors.length} error${
					errors.length > 1 ? "s" : ""
				}):\n${summary}`,
			),
		);
	}

	return Ok({
		discord: {
			token: token!,
			applicationId: applicationId!,
			guildId: guildId!,
		},
		owner: {
			id: ownerId!,
		},
		emojis: {
			success: optionalString(raw.emojis?.success, defaults.emojis!.success),
			error: optionalString(raw.emojis?.error, defaults.emojis!.error),
			loading: optionalString(raw.emojis?.loading, defaults.emojis!.loading),
		},
		sqlite: {
			path: optionalString(raw.sqlite?.path, defaults.sqlite!.path),
		},
		commands: {
			defaultCooldownMs,
			maxMentions,
		},
		cache: {
			contextTtlMs,
		},
	});
}

export function requireConfig(path = DEFAULT_CONFIG_PATH): KuristinaConfig {
	const result = loadConfig(path);
	if (!result.ok) {
		console.error(`\nfailed to load config:\n  ${result.error.message}\n`);
		Deno.exit(1);
	}
	return result.value;
}

let config: KuristinaConfig;

export function getConfig() {
	return config ??= requireConfig();
}
