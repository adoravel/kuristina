/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

// deno-lint-ignore no-import-prefix
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { ParsingError, ParsingResult, prettify } from "~/lib/combinators/mod.ts";

export * from "jsr:@std/assert@1.0.19";

/**
 * assert a parse succeeded and return the parsed data.
 * throws with a prettified error message on failure
 */
export function assertSuccess<T>(res: ParsingResult<T>): T {
	if (res.kind === "error") {
		throw new Error(`parse unexpectedly failed:\n${prettify(res.data)}`);
	}
	assertEquals(res.kind, "success");
	return res.data as T;
}

/**
 * assert a parse failed and return the error for inspection.
 * throws if the parse succeeded
 */
export function assertFail(res: ParsingResult<any>): ParsingError {
	if (res.kind !== "error") {
		throw new Error(
			`expected parse to fail but it succeeded with: ${JSON.stringify(res.data)}`,
		);
	}
	return res.data;
}

/**
 * assert parse succeeded with a specific value
 */
export function compare<T>(res: ParsingResult<T>, expected: T): void {
	const data = assertSuccess(res);
	assertEquals(data, expected);
}
