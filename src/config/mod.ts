/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { parse as parseToml } from "@std/toml";
import { Fail, Ok, type Result } from "~/lib/result.ts";
import { config$Errors, type ConfigError, type FieldError } from "~/config/errors.ts";
import { field, type Infer, parseSchema } from "~/config/schema.ts";

const configSchema = {
	discord: {
		token: field.string(),
		applicationId: field.snowflake(),
		guildId: field.snowflake(),
	},
	owner: {
		id: field.snowflake(),
	},
	sqlite: {
		path: field.stringOr("./data/kuristina.sqlite"),
	},
	emojis: {
		success: field.stringOr("✅"),
		error: field.stringOr("❌"),
		loading: field.stringOr("⏳"),
	},
	commands: {
		defaultCooldownMs: field.positiveInt(3_000),
		maxMentions: field.positiveInt(5),
	},
	cache: {
		contextTtlMs: field.positiveInt(45_000),
	},
	modules: {
		client: field.boolean(false),
		commands: field.record(field.boolean(false)),
		markov: {
			enabled: field.boolean(false),
			channelId: field.snowflakeOr(0n),
		},
		deepl: {
			enabled: field.boolean(false),
			baseUrl: field.stringOr("https://api-free.deepl.com/v2"),
			apiKey: field.stringOr(""),
		},
	},
} as const;

export type KuristinaConfig = Infer<typeof configSchema>;
export const DEFAULT_CONFIG_PATH = "config.toml";

export function loadConfig(path = DEFAULT_CONFIG_PATH): Result<KuristinaConfig, ConfigError> {
	let text: string;
	try {
		text = Deno.readTextFileSync(path);
	} catch (e) {
		if (e instanceof Deno.errors.NotFound) return Fail(config$Errors.notFound(path));
		if (e instanceof Deno.errors.PermissionDenied) {
			return Fail(config$Errors.permissionDenied(path));
		}
		return Fail(config$Errors.parseFailed(path, e instanceof Error ? e.message : String(e)));
	}

	let raw: Record<string, unknown>;
	try {
		raw = parseToml(text) as Record<string, unknown>;
	} catch (e) {
		return Fail(config$Errors.parseFailed(path, e instanceof Error ? e.message : String(e)));
	}

	const errors: FieldError[] = [];
	const config = parseSchema(configSchema, raw, "", errors);
	if (errors.length) return Fail(config$Errors.invalid(errors));

	return Ok(config);
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

export const getConfig = () => config ??= requireConfig();

export function cfg(path: string): boolean {
	const keys = path.split(".");
	let node: unknown = getConfig().modules;

	for (const key of keys) {
		if (node === null || typeof node !== "object") return false;
		node = (node as Record<string, unknown>)[key];
	}

	// allow cfg("modules.markov") as shorthand for cfg("modules.markov.enabled")
	if (node !== null && typeof node === "object") {
		node = (node as Record<string, unknown>)["enabled"];
	}

	return node === true;
}
