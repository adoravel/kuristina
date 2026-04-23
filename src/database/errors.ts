/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { TaggedError } from "~/lib/errors.ts";

export type SqlErrorKind =
	| "query_failed" // generic SQL error
	| "not_found" // row not found
	| "constraint"; // unique constraint violated

export interface SqlError extends TaggedError<"sql", SqlErrorKind> {
	readonly message: string;
	readonly cause?: string;
}

export const sql$Errors = {
	queryFailed: (sql: string, cause: string): SqlError => ({
		kind: "sql",
		tag: "query_failed",
		message: `Database query failed: ${sql}`,
		cause,
	}),

	notFound: (table: string, id: string): SqlError => ({
		kind: "sql",
		tag: "not_found",
		message: `No entry found in ${table} for ${id}`,
	}),

	constraint: (msg: string): SqlError => ({
		kind: "sql",
		tag: "constraint",
		message: `Constraint violation: ${msg}`,
	}),
} as const;
