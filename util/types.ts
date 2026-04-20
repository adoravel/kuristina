/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export type Flatten<T> = T extends Array<infer U> ? U : T;

export type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};

export type DeepMutable<T> = {
	-readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

type CamelToSnake<S extends string> = S extends `${infer T}${infer U}`
	? U extends Uncapitalize<U> ? `${Lowercase<T>}${CamelToSnake<U>}`
	: `${Lowercase<T>}_${CamelToSnake<Uncapitalize<U>>}`
	: S;

export type SnakeCase<T> = {
	[K in keyof T as CamelToSnake<string & K>]: T[K];
};
