/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { MAX_KEY_VALUE_PAIRS } from "./constants.ts";

export interface ParseResult {
	valid: true;
	value: Record<string, string>;
}

export interface ParseError {
	valid: false;
	message: string;
}

export type ParseKeyValueResult = ParseResult | ParseError;

export function parseKeyValuePairs(input: string): ParseKeyValueResult {
	const result: Record<string, string> = {};
	let current = "";
	let key = "";
	let inQuotes = false;
	let escaped = false;
	let pairs = 0;

	if (input.length === 0) {
		return { valid: false, message: "Input is empty" };
	}

	for (let i = 0; i < input.length && pairs < MAX_KEY_VALUE_PAIRS; i++) {
		const char = input[i];

		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === "\\") {
			escaped = true;
			continue;
		}

		if (char === '"' || char === "'") {
			inQuotes = !inQuotes;
			continue;
		}

		if (!inQuotes) {
			if (char === "=" && !key) {
				key = current.trim();
				if (!key) {
					return { valid: false, message: "Empty key before '='" };
				}
				current = "";
				continue;
			}

			if (char === ",") {
				if (key) {
					result[key] = current.trim();
					key = "";
					current = "";
					pairs++;
				}
				continue;
			}
		}

		current += char;
	}

	if (key && current !== undefined) {
		result[key] = current.trim();
	}

	if (!Object.keys(result).length) {
		return { valid: false, message: "No valid key=value pairs found" };
	}

	return { valid: true, value: result };
}

export function parseKeyValuePairsStrict(
	input: string,
	requiredKeys?: string[],
): { valid: true; value: Record<string, string> } | { valid: false; message: string } {
	const result = parseKeyValuePairs(input);
	if (!result.valid) return result;

	if (requiredKeys) {
		const missing = requiredKeys.filter((k) => !(k in result.value));
		if (missing.length) {
			return { valid: false, message: `Missing required keys: ${missing.join(", ")}` };
		}
	}

	return { valid: true, value: result.value };
}
