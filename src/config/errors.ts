/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { TaggedError } from "~/lib/errors.ts";

export type ConfigErrorKind =
	| "not_found" // config file does not exist
	| "permission_denied" // config file exists but cannot be read
	| "parse_failed" // invalid TOML syntax
	| "invalid"; // TOML parsed but fields failed validation

export interface FieldError {
	readonly path: string;
	readonly message: string;
}

export interface ConfigError extends TaggedError<"config", ConfigErrorKind> {
	readonly message: string;
	readonly invalidFields?: readonly FieldError[];
}

export const config$Errors = {
	notFound: (path: string): ConfigError => ({
		kind: "config",
		tag: "not_found",
		message:
			`Config file not found @ \`${path}\`. Copy \`config.example.toml\` and fill in your values.`,
	}),

	permissionDenied: (path: string): ConfigError => ({
		kind: "config",
		tag: "permission_denied",
		message: `Cannot read config @ \`${path}\`.`,
	}),

	parseFailed: (path: string, detail: string): ConfigError => ({
		kind: "config",
		tag: "parse_failed",
		message: `Invalid TOML @ \`${path}\`: ${detail}`,
	}),

	invalid: (fields: readonly FieldError[]): ConfigError => ({
		kind: "config",
		tag: "invalid",
		message: `config validation failed (${fields.length} error${fields.length > 1 ? "s" : ""})`,
		invalidFields: fields,
	}),
} as const;

export function config$describe(e: ConfigError): string {
	switch (e.tag) {
		case "not_found":
		case "permission_denied":
		case "parse_failed":
			return e.message;
		case "invalid": {
			const summary = e.invalidFields?.map((e) => `  • ${e.path}: ${e.message}`) ?? [];
			return `${e.message}:\n${summary.join("\n")}`;
		}
	}
}
