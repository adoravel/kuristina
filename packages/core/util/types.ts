/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type Flatten<T> = T extends Array<infer U> ? U : T;

export type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};

export type DeepMutable<T> = {
	-readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

type CamelCase<S extends string> = S extends `${infer T}_${infer U}`
	? `${T}${Capitalize<CamelCase<U>>}`
	: S;
type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
	? `${T extends Lowercase<T> ? "" : "_"}${Lowercase<T>}${SnakeCase<U>}`
	: S;

type Camel<T> = T extends any[] ? T extends Record<any, any>[] ? Camel<T[number]>[]
	: T
	: T extends Record<any, any> ? { [K in keyof T as CamelCase<K & string>]: Camel<T[K]> }
	: T;

type Snake<T> = T extends any[] ? T extends Record<any, any>[] ? Snake<T[number]>[]
	: T
	: T extends Record<any, any> ? { [K in keyof T as SnakeCase<K & string>]: Snake<T[K]> }
	: T;

export type { Camel as CamelCase, Snake as SnakeCase };
