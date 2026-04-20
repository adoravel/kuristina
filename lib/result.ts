/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Errors, NetworkError } from "~/lib/errors.ts";

type Ok<T> = {
	readonly ok: true;
	readonly value: T;
};

type Err<E> = {
	readonly ok: false;
	readonly error: E;
};

export type Result<T, E = never> = [E] extends [never] ? Ok<T> : Ok<T> | Err<E>;

export const Ok = <T>(value: T): Result<T, never> => ({
	ok: true,
	value,
});

export const Fail = <E>(error: E): Result<never, E> =>
	({
		ok: false,
		error,
	}) as Result<never, E>;

export async function tryAsync<T, E = NetworkError>(
	fn: () => Promise<T>,
	mapError: (e: unknown) => E = (e) =>
		Errors.network(e instanceof Error ? e.message : String(e)) as E,
): Promise<Result<T, E>> {
	try {
		return Ok(await fn());
	} catch (e) {
		return Fail(mapError(e));
	}
}
