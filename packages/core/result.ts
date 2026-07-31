/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { Errors, type NetworkError } from "./errors.ts";

type Ok<T> = {
	readonly ok: true;
	readonly value: T;
};

type Err<E> = {
	readonly ok: false;
	readonly error: E;
};

export type Result<T, E = never> = [E] extends [never] ? Ok<T> : Ok<T> | Err<E>;

export const ok = <T>(value: T): Result<T, never> => ({
	ok: true,
	value,
});

export const err = <E>(error: E): Result<never, E> =>
	({
		ok: false,
		error,
	}) as Result<never, E>;

export function map<T, U, E>(fn: (value: T) => U): (result: Result<T, E>) => Result<U, E> {
	return (result) => result.ok ? ok(fn(result.value)) : err(result.error);
}

export function discard<E>(result: Result<any, E>): Result<void, E> {
	return result.ok ? ok(undefined) : result;
}

export function flatMap<T, U, E>(
	fn: (value: T) => Result<U, E>,
): (result: Result<T, E>) => Result<U, E> {
	return (result) => result.ok ? fn(result.value) : err(result.error);
}

export function flatMapAsync<T, U, E>(
	fn: (value: T) => Promise<Result<U, E>>,
): (result: Result<T, E>) => Promise<Result<U, E>> {
	return async (result) => {
		if (!result.ok) return err(result.error);
		return await fn(result.value);
	};
}

export function and<T, U, E>(other: Result<U, E>): (result: Result<T, E>) => Result<T & U, E> {
	return (result) =>
		result.ok
			? (other.ok ? ok({ ...result.value, ...other.value }) : err(other.error))
			: err(result.error);
}

export function or<T, E>(alternative: () => Result<T, E>): (result: Result<T, E>) => Result<T, E> {
	return (result) => (result.ok ? result : alternative());
}

export function orAsync<T, E>(
	alternative: () => Promise<Result<T, E>>,
): (result: Result<T, E>) => Promise<Result<T, E>> {
	return async (result) => (result.ok ? result : await alternative());
}

export function tap<T, E>(fn: (value: T) => void): (result: Result<T, E>) => Result<T, E> {
	return (result) => {
		if (result.ok) fn(result.value);
		return result;
	};
}

export function tapError<T, E>(fn: (error: E) => void): (result: Result<T, E>) => Result<T, E> {
	return (result) => {
		if (!result.ok) fn(result.error);
		return result;
	};
}

export function unwrap<T, E>(result: Result<T, E>): T {
	if (!result.ok) throw result.error;
	return result.value;
}

export function unwrapOr<T, E>(defaultValue: T): (result: Result<T, E>) => T {
	return (result) => (result.ok ? result.value : defaultValue);
}

export async function tryAsync<T, E = NetworkError>(
	fn: () => Promise<T>,
	mapError: (e: unknown) => E = (e) =>
		Errors.network(e instanceof Error ? e.message : String(e)) as E,
): Promise<Result<T, E>> {
	try {
		return ok(await fn());
	} catch (e) {
		return err(mapError(e));
	}
}

export function safePromise<T, E = NetworkError>(promise: Promise<T>): Promise<Result<T, E>> {
	return tryAsync(
		() => promise,
		(e) => Errors.network(e instanceof Error ? e.message : String(e)) as E,
	);
}

export function filter<T, E>(
	predicate: (value: T) => boolean,
	error: E,
): (result: Result<T, E>) => Result<T, E> {
	return (result) => result.ok ? (predicate(result.value) ? result : err(error)) : result;
}

export function forEach<T, E>(
	fn: (value: T) => void,
): (result: Result<T, E>) => void {
	return (result) => {
		if (result.ok) fn(result.value);
	};
}

export function sequence<T, E>(
	results: readonly Result<T, E>[],
): Result<T[], E> {
	const values: T[] = [];
	for (const r of results) {
		if (!r.ok) {
			return err(r.error);
		}
		values.push(r.value);
	}
	return ok(values);
}
