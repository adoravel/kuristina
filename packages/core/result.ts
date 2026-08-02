/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
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

export type Result<T, E = never> = Ok<T> | Err<E>;

export type AsyncResult<T, E = never> = Promise<Result<T, E>>;

type DeepAwaited<T> = T extends Promise<infer U> ? DeepAwaited<U> : T;

type DistributeOk<T> = T extends { readonly ok: true; readonly value: infer V } ? V : never;
type DistributeErr<T> = T extends { readonly ok: false; readonly error: infer E } ? E : never;

export type ExtractOk<R> = DistributeOk<DeepAwaited<R>>;
export type ExtractErr<R> = DistributeErr<DeepAwaited<R>>;

export const ok = <T>(value: T): Result<T, never> => ({
	ok: true,
	value,
});

export const err = <E>(error: E): Result<never, E> =>
	({
		ok: false,
		error,
	}) as Result<never, E>;

export const map = <T, E>(result: Result<T, E>) => <U>(fn: (value: T) => U): Result<U, E> => {
	if (!result.ok) return err(result.error);
	try {
		return ok(fn(result.value));
	} catch (error) {
		return err(error as E);
	}
};

export const mapAsync =
	<T, E>(promise: Promise<Result<T, E>>) =>
	<U>(fn: (value: T) => Promise<U> | U): Promise<Result<U, E>> =>
		promise.then(async (result) => {
			if (!result.ok) return err(result.error);
			try {
				return ok(await fn(result.value));
			} catch (error) {
				return err(error as E);
			}
		});

export function discard<E>(result: Result<any, E>): Result<void, E> {
	return result.ok ? ok(undefined) : result;
}

export const flatMap =
	<T, E>(result: Result<T, E>) => <U>(fn: (value: T) => Result<U, E>): Result<U, E> => {
		return result.ok ? fn(result.value) : err(result.error);
	};

export const flatMapAsync =
	<T, E>(promise: Promise<Result<T, E>>) =>
	<U>(fn: (value: T) => Promise<Result<U, E>> | Result<U, E>): Promise<Result<U, E>> =>
		promise.then((result) => result.ok ? fn(result.value) : err(result.error));

export const flatMapError =
	<T, E>(result: Result<T, E>) => <F>(fn: (error: E) => Result<T, F>): Result<T, F> => {
		return result.ok ? ok(result.value) : fn(result.error);
	};

export const flatMapErrorAsync =
	<T, E>(promise: Promise<Result<T, E>>) =>
	<F>(fn: (error: E) => Promise<Result<T, F>> | Result<T, F>): Promise<Result<T, F>> =>
		promise.then((result) => (result.ok ? ok(result.value) : fn(result.error)));

export const and = <T, E>(result: Result<T, E>) => <U>(other: Result<U, E>): Result<T & U, E> => {
	if (!result.ok) return err(result.error);
	if (!other.ok) return err(other.error);

	const combined = (typeof result.value === "object" && result.value !== null)
		? { ...result.value, ...other.value }
		: other.value;

	return ok(combined as T & U);
};

export const or =
	<T, E>(result: Result<T, E>) => (alternative: () => Result<T, E>): Result<T, E> => {
		return result.ok ? result : alternative();
	};

export const orAsync =
	<T, E>(result: Result<T, E>) =>
	async (alternative: () => Promise<Result<T, E>>): Promise<Result<T, E>> => {
		return result.ok ? result : await alternative();
	};

export const tap = <T, E>(result: Result<T, E>) => (fn: (value: T) => void): Result<T, E> => {
	if (result.ok) fn(result.value);
	return result;
};

export const tapError = <T, E>(result: Result<T, E>) => (fn: (error: E) => void): Result<T, E> => {
	if (!result.ok) fn(result.error);
	return result;
};

export const tapErrorAsync =
	<T, E>(promise: Promise<Result<T, E>>) =>
	(fn: (error: E) => Promise<void> | void): Promise<Result<T, E>> =>
		promise.then(async (result) => {
			if (!result.ok) await fn(result.error);
			return result;
		});

export function unwrap<T, E>(result: Result<T, E>): T {
	if (!result.ok) throw result.error;
	return result.value;
}

export const unwrapOr = <T, E>(result: Result<T, E>) => (defaultValue: T): T => {
	return result.ok ? result.value : defaultValue;
};

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

export const filter =
	<T, E>(result: Result<T, E>) => (predicate: (value: T) => boolean, error: E): Result<T, E> => {
		return result.ok ? (predicate(result.value) ? result : err(error)) : result;
	};

export const forEach = <T, E>(result: Result<T, E>) => (fn: (value: T) => void): void => {
	if (result.ok) fn(result.value);
};

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
