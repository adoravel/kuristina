/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { FxStatus, FxTombstone } from "./types.ts";

export function isTombstone(value: unknown): value is FxTombstone {
	return (
		typeof value === "object" &&
		value !== null &&
		"type" in value &&
		value.type === "tombstone"
	);
}

export function isStatus(value: unknown): value is FxStatus {
	return (
		typeof value === "object" &&
		value !== null &&
		"id" in value &&
		"text" in value &&
		"author" in value &&
		!isTombstone(value)
	);
}
