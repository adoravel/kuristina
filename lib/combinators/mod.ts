/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { literal } from "./constructions.ts";
import { buildDefaultMessage, ParsingError } from "./error.ts";
import { StringStream } from "./stream.ts";

export * from "./error.ts";

export type Input = StringStream;

export type Tagged<Tag extends string, T> =
	& { kind: Tag }
	& (T extends never ? Record<PropertyKey, never> : { data: T });

export type Parse<T> = (input: Input) => ParsingResult<T>;

export type Parser<T> = Parse<T> & {
	tag?: string;
	next?: Parser<any>;
	map<U>(
		tag: string,
		fn: (input: Input, value: T) => ParsingResult<U>,
	): Parser<U>;
	label(description: string): Parser<T>;
};

export type Lexer<T> = Parse<T> | Parser<T> | string;

export type ParsingResult<T> =
	| Tagged<"success", T>
	| Tagged<"error", ParsingError>;

export function toParser<T extends string>(lex: T, tag?: string): Parser<T>;
export function toParser<T>(lex: Lexer<T>, tag?: string): Parser<T>;

export function toParser<T>(lex: Lexer<T>, tag?: string): Parser<T> {
	if (typeof lex === "string") return literal(lex) as Parser<T>;
	if ("map" in lex) return lex;

	const pars = lex as Parser<T>;
	pars.tag = tag || ("tag" in lex ? lex.tag as string : undefined);

	pars.map = <U>(
		tag: string,
		fn: (input: Input, value: T) => ParsingResult<U>,
	): Parser<U> => {
		const neue = toParser<U>((src: Input) => {
			const result = pars(src);
			if (infer("success")(result)) {
				return fn(src, result.data as T);
			}
			if (infer("error")(result)) {
				result.data.stack.unshift({
					parser: pars.tag,
					position: result.data.position,
				});
			}
			return result as ParsingResult<U>;
		}, tag);
		return neue.next = pars, neue;
	};

	pars.label = (description: string): Parser<T> => {
		return toParser((src: Input) => {
			const result = pars(src);
			if (infer("error")(result)) {
				result.data.expected = [description];
				result.data.message = buildDefaultMessage(
					[description],
					result.data.found,
					result.data.position,
				);
			}
			return result;
		}, pars.tag);
	};

	return pars;
}

export function infer<K extends string, U>(
	kind: K,
): (value: Tagged<K, U> | Tagged<any, any>) => value is Tagged<K, U> {
	return (value): value is Tagged<K, U> => value.kind === kind;
}
