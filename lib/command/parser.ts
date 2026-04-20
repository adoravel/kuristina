/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
	few,
	insensitive,
	literal,
	many,
	optional,
	pick,
	skipWhitespace as skip,
	unordered,
} from "~combinators/constructions.ts";
import { Lexer, Parser, toParser as construct, unexpectedSymbol, yay } from "~combinators/mod.ts";
import { greedyString, word } from "~combinators/primitives.ts";

export const escape = few(literal("\\"), pick('"', "\\", "n", "t", "r")).map(
	"escape",
	(_, [, char]) => {
		switch (char) {
			case "n":
				return yay("\n");
			case "t":
				return yay("\t");
			case "r":
				return yay("\r");
			default:
				return yay(char);
		}
	},
);

export const quoted = (delimiter: string) =>
	few(
		literal(delimiter),
		many(pick(
			escape,
			construct((stream) => {
				const char = stream.peek();
				if (!char || char === delimiter) {
					return unexpectedSymbol(stream, ["character (not delimiter)"]);
				}
				return stream.advance(), yay(char);
			}, "quoted_inner"),
		)),
		literal(delimiter),
	).map(`quoted(${delimiter})`, (_, [, chars]) => yay(chars.join("")));

export const quotedString = pick(quoted('"'), quoted("'"));

export const string = pick(quotedString, word);

export const flag = (name: string): Parser<string> =>
	few(literal("-"), insensitive(name)).map(
		`flag(-${name})`,
		(_, [, flag]) => yay(flag),
	);

export const positional = <T>(name: string, kind: Lexer<T>) =>
	few(skip, flag(name), skip, kind)
		.map(
			`arg(-${name})`,
			(_, [, , , value]) => yay(value),
		);

export interface Command<T extends Record<string, any>, R = string> {
	args: T;
	remaining: R;
}

export type CommandArgs<L extends Record<string, any>> = {
	[K in keyof L]: L[K] extends Lexer<infer U> ? U : never;
};

export type CommandRemaining<R> = R extends Lexer<infer U> ? U : never;

export type CommandParser<L extends Record<string, Parser<any>>, R = string> =
	& Parser<Command<CommandArgs<L>, R>>
	& {
		args: Parser<any>[];
	};

export function command<L extends Record<string, Parser<any>>, R = string>(
	lexers: L,
	remainingParser?: Parser<R>,
): CommandParser<L, R> {
	const args = Object.entries(lexers)
		.map(([name, lx]) =>
			lx.tag?.endsWith("?") ? optional(positional(name, lx.next!)) : positional(name, lx)
		);

	const remaining = remainingParser
		? few(skip, remainingParser).map(
			"remaining",
			(_, [, value]) => yay(value),
		)
		: optional(
			few(skip, greedyString).map(
				"remnants",
				(_, [, text]) => yay(text as R),
			),
		);

	const commandParser = few(
		unordered(...args),
		remaining,
	).map("command", (_, [args, remaining]) => {
		const keys = Object.keys(lexers) as (keyof L)[];
		const namedArgs = Object.fromEntries(
			keys.map((k, i) => [k, args[i]]),
		) as CommandArgs<L>;
		return yay({
			args: namedArgs,
			remaining,
		});
	}) as CommandParser<L, R>;

	return commandParser.args = args, commandParser;
}
