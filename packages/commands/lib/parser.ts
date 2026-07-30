/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	attempt,
	error,
	few,
	infer,
	insensitive,
	literal,
	many,
	pick,
	skipWhitespace as skip,
	StringStream,
	word,
} from "@kuristina/commands";
import {
	type Lexer,
	type Parser,
	type ParsingResult,
	toParser as construct,
	unexpectedSymbol,
	yay,
} from "@kuristina/commands";

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
	const specs = Object.entries(lexers).map(([name, lx]) => ({
		name,
		required: !lx.tag?.endsWith("?"),
		value: (lx.tag?.endsWith("?") ? lx.next! : lx) as Parser<any>,
	}));

	const attemptedSpecs = specs.map((s) => ({
		...s,
		parser: attempt(positional(s.name, s.value)),
	}));

	const parser = construct((stream) => {
		const values: Record<string, unknown> = {};
		const remainingParts: string[] = [];

		while (!stream.isEOF()) {
			stream.skipWhitespace();
			if (stream.isEOF()) break;

			const flag = attemptedSpecs.find(({ name, parser }) => {
				const at = parser(stream);
				if (!infer("success")(at)) return false;
				values[name] = at.data;
				return true;
			});
			if (flag) continue;

			const tok = string(stream);
			if (!infer("success")(tok)) return tok as ParsingResult<never>;
			remainingParts.push(tok.data);
		}

		const missing = specs.find((s) => s.required && !(s.name in values));
		if (missing) {
			return error(stream, `missing required argument -${missing.name}`, [`-${missing.name}`]);
		}

		const namedArgs = Object.fromEntries(
			specs.map(({ name }) => [name, values[name] ?? null]),
		) as CommandArgs<L>;

		const remainingText = remainingParts.join(" ");
		if (!remainingParser) return yay({ args: namedArgs, remaining: remainingText as R });

		const remResult = remainingParser(new StringStream(remainingText));
		if (!infer("success")(remResult)) return remResult as ParsingResult<never>;

		return yay({ args: namedArgs, remaining: remResult.data });
	}, "command") as CommandParser<L, R>;

	return parser.args = specs.map((s) => s.value), parser;
}
