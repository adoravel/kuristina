/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { mergeErrors, ParsingError } from "./error.ts";
import {
	error,
	expectedEoi,
	infer,
	Input,
	Lexer,
	Parser,
	ParsingResult,
	toParser as construct,
	unexpectedEoi,
	unexpectedSymbol,
	yay,
} from "./mod.ts";

export const whitespace = pick(" ", "\t", "\r", "\n");

export const skipWhitespace = construct((stream) => {
	stream.skipWhitespace();
	return yay(null);
}, "whitespace") as Parser<null>;

/** try parser, restoring position on failure */
export function attempt<T>(lex: Lexer<T>): Parser<T> {
	const inner = construct(lex);
	return construct((stream) => {
		stream.push();
		const result = inner(stream);
		if (infer("success")(result)) {
			stream.pop();
		} else {
			stream.restore();
		}
		return result;
	}, `attempt(${inner.tag})`);
}

/** lookahead, restores position afterward */
export function discard<T>(lex: Lexer<T>): Parser<T> {
	const inner = construct(lex);
	return construct((stream) => {
		stream.push();
		const result = inner(stream);
		stream.restore();
		return result;
	}, `discard(${inner.tag})`);
}

export function pick<T extends string[]>(...lexers: T): Parser<T[number]>;
export function pick<T extends any[]>(
	...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T[number]>;
export function pick(...lexers: any[]): any {
	const parsers = lexers.map((l) => construct(l));
	const tags = parsers.map((p) => p.tag).filter(Boolean);

	return construct((stream) => {
		const errors: ParsingError[] = [];

		for (const parser of parsers) {
			const at = attempt(parser)(stream);
			if (infer("success")(at)) {
				return yay(at.data);
			}
			if (infer("error")(at)) {
				errors.push(at.data);
			}
		}

		if (errors.length) {
			return { kind: "error", data: mergeErrors(errors) } as ParsingResult<
				never
			>;
		}

		return unexpectedEoi(stream, tags.length ? tags : ["any pick"]);
	}, tags.length ? `pick(${tags.join(", ")})` : "pick");
}

export function few<T extends string[]>(...lexers: T): Parser<T>;
export function few<T extends any[]>(
	...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T>;
export function few(...lexers: any[]): any {
	const parsers = lexers.map((l) => construct(l));
	const tags = parsers.map((p) => p.tag).join(", ");

	return construct((stream) => {
		const output: unknown[] = [];

		for (const parser of parsers) {
			const result = parser(stream);
			if (!infer("success")(result)) {
				return result as ParsingResult<never>;
			}
			output.push(result.data);
		}

		return yay(output);
	}, `few(${tags})`);
}

export function unordered<T extends string[]>(...lexers: T): Parser<T>;
export function unordered<T extends any[]>(
	...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T>;
export function unordered(...lexers: any[]): any {
	const parsers = lexers.map((lx) => construct(lx));
	const tags = parsers.map((p) => p.tag).join(",");

	return construct((stream) => {
		const output = new Array(parsers.length);
		const parsed = new Set<number>();

		stream.push();

		for (let slot = 0; slot < parsers.length; slot++) {
			let found = false;

			for (let index = 0; index < parsers.length; index++) {
				if (parsed.has(index)) continue;

				stream.push();
				const result = parsers[index](stream);

				if (infer("success")(result)) {
					output[index] = result.data;
					parsed.add(index);
					stream.pop(), found = true;
					break;
				}

				stream.restore();
			}

			if (!found) {
				const remaining = parsers
					.filter((_, i) => !parsed.has(i))
					.map((p) => p.tag);

				return error(
					stream,
					`Expected one of: ${remaining.join(", ")} (in any order)`,
					remaining,
				);
			}
		}

		stream.pop();
		return yay(output);
	}, `unordered(${tags})`);
}

export function many<T>(lexer: Lexer<T>): Parser<T[]> {
	const inner = construct(lexer);
	return construct((stream) => {
		const output: T[] = [];

		while (!stream.isEOF()) {
			const at = attempt(inner)(stream);
			if (!infer("success")(at)) {
				break;
			}
			output.push(at.data as T);
		}

		return yay(output);
	}, `${inner.tag}*`);
}

export function sequence<T>(lexer: Lexer<T>): Parser<T[]> {
	const inner = construct(lexer);
	return few(inner, many(inner)).map(
		`${inner.tag}+`,
		(_, [first, rest]) => yay([first, ...rest]),
	);
}

export function array<T>(n: number, lexer: Lexer<T>): Parser<T[]> {
	const inner = construct(lexer);
	return construct((stream) => {
		const output: T[] = [];

		for (let i = 0; i < n; i++) {
			const result = inner(stream);
			if (!infer("success")(result)) {
				return result as ParsingResult<never>;
			}
			output.push(result.data);
		}

		return yay(output);
	}, `${inner.tag}{${n}}`);
}

export function atLeast<T>(n: number, lexer: Lexer<T>): Parser<T[]> {
	const inner = construct(lexer);
	return few(array(n, inner), many(inner)).map(
		`${inner.tag}{${n},}`,
		(_, [required, optional]) => yay([...required, ...optional]),
	);
}

export function atMost<T>(n: number, lexer: Lexer<T>): Parser<T[]> {
	const inner = construct(lexer);
	return construct((stream) => {
		const output: T[] = [];

		for (let i = 0; i < n; i++) {
			const result = attempt(inner)(stream);
			if (!infer("success")(result)) {
				break;
			}
			output.push(result.data);
		}

		return yay(output);
	}, `${inner.tag}{,${n}}`);
}

export function optional<T>(lexer: Lexer<T>): Parser<T | null> {
	const inner = construct(lexer);
	const parser = construct((stream) => {
		const at = attempt(inner)(stream);
		if (infer("success")(at)) {
			return at as ParsingResult<T>;
		}
		return yay(null);
	}, `${inner.tag}?`);

	parser.next = inner;
	return parser;
}

export const lookahead = discard;

export function negate<T>(lexer: Lexer<T>): Parser<null> {
	const inner = construct(lexer);
	return construct((stream) => {
		const result = discard(inner)(stream);
		if (infer("success")(result)) {
			return error(
				stream,
				`Expected NOT to match ${inner.tag}`,
				[`not ${inner.tag}`],
			);
		}
		return yay(null);
	}, `!${inner.tag}`);
}

export function only<T>(lexer: Lexer<T>): Parser<T> {
	const inner = construct(lexer);
	return construct((stream) => {
		const at = inner(stream);
		if (!infer("success")(at)) {
			return at as ParsingResult<never>;
		}
		if (!stream.isEOF()) {
			return expectedEoi(stream);
		}
		return yay(at.data as T);
	}, `only(${inner.tag})`);
}

export function all<T>(lexer: Lexer<T>): Parser<T[]> {
	const inner = construct(lexer);
	return construct((stream) => {
		const output: T[] = [];

		while (!stream.isEOF()) {
			const at = inner(stream);
			if (!infer("success")(at)) {
				return at as ParsingResult<never>;
			}
			output.push(at.data as T);
		}

		return yay(output);
	}, `all(${inner.tag})`);
}

export function token<T>(lexer: Lexer<T>): Parser<T> {
	return few(skipWhitespace, lexer).map(
		`token(${construct(lexer).tag})`,
		(_, [_ws, value]) => yay(value),
	);
}

export function eof(): Parser<null> {
	return construct((stream) => {
		if (!stream.isEOF()) {
			return expectedEoi(stream);
		}
		return yay(null);
	}, "EOF");
}

export function literal<T extends string>(input: T): Parser<T> {
	return construct((stream) => {
		if (!stream.matches(input)) {
			return unexpectedSymbol(stream, [`"${input}"`]);
		}

		for (let i = 0; i < input.length; i++) {
			stream.advance();
		}

		return yay(input);
	}, `"${input}"`);
}

export function insensitive<T extends string>(input: T): Parser<T> {
	const lookup = input.toLowerCase();

	return construct((stream) => {
		for (let i = 0; i < lookup.length; i++) {
			const char = stream.advance();
			if (!char || char.toLowerCase() !== lookup[i]) {
				return unexpectedSymbol(
					stream,
					[`"${input}" (case-insensitive)`],
				);
			}
		}

		return yay(input);
	}, `"${input}"i`);
}

export function range(start: string, end: string): Parser<string> {
	return construct((stream) => {
		const char = stream.peek();

		if (!char) {
			return unexpectedEoi(stream, [`[${start}-${end}]`]);
		}

		if (char < start[0] || char > end[0]) {
			return unexpectedSymbol(stream, [`[${start}-${end}]`]);
		}

		stream.advance();
		return yay(char);
	}, `[${start}-${end}]`);
}

export function pattern(regex: RegExp): Parser<string> {
	return construct((stream: Input) => {
		const remaining = stream.tail();
		const anchoredPattern = new RegExp(`^(?:${regex.source})`, regex.flags);
		const match = remaining.match(anchoredPattern);

		if (!match) {
			return unexpectedSymbol(stream, [`/${regex.source}/`]);
		}
		for (let i = 0; i < match[0].length; i++) {
			stream.advance();
		}

		return yay(match[0]);
	}, `/${regex.source}/`);
}

export function capture(
	regex: RegExp,
): Parser<{ match: string; groups: string[] }> {
	return construct((stream: Input) => {
		const remaining = stream.tail();
		const anchoredPattern = new RegExp(`^(?:${regex.source})`, regex.flags);
		const result = remaining.match(anchoredPattern);

		if (!result) {
			return unexpectedSymbol(
				stream,
				[`/${regex.source}/`],
			);
		}

		const [match, ...groups] = result;
		for (let i = 0; i < match.length; i++) {
			stream.advance();
		}

		return yay({ match, groups });
	}, `capture(/${regex.source}/)`);
}

export function sepBy1<T, S>(
	item: Lexer<T>,
	separator: Lexer<S>,
): Parser<T[]> {
	const itemParser = construct(item);
	const sepParser = construct(separator);

	return few(
		itemParser,
		many(
			few(sepParser, itemParser).map("sep_tail", (_, [_sep, val]) => yay(val)),
		),
	).map(
		`sepBy1(${itemParser.tag},${sepParser.tag})`,
		(_, [first, rest]) => yay([first, ...rest]),
	);
}

export function sepBy<T, S>(
	item: Lexer<T>,
	separator: Lexer<S>,
): Parser<T[]> {
	const itemParser = construct(item);
	const sepParser = construct(separator);

	return optional(sepBy1(item, separator)).map(
		`sepBy(${itemParser.tag},${sepParser.tag})`,
		(_, value) => yay(value ?? []),
	);
}

export function endBy<T, S>(
	item: Lexer<T>,
	terminator: Lexer<S>,
): Parser<T[]> {
	const itemParser = construct(item), term = construct(terminator);

	return many(
		few(itemParser, term).map(
			"endby_item",
			(_, [val, _term]) => yay(val),
		),
	);
}

export function sepEndBy<T, S>(
	item: Lexer<T>,
	separator: Lexer<S>,
): Parser<T[]> {
	const itemParser = construct(item), sepParser = construct(separator);

	return few(
		optional(sepBy1(item, separator)),
		optional(sepParser),
	).map(
		`sepEndBy(${itemParser.tag},${sepParser.tag})`,
		(_, [items, _sep]) => yay(items ?? []),
	);
}

export function between<L, R, T>(
	left: Lexer<L>,
	right: Lexer<R>,
	content: Lexer<T>,
): Parser<T> {
	const leftParser = construct(left),
		rightParser = construct(right),
		contentParser = construct(content);

	return few(leftParser, contentParser, rightParser).map(
		`${leftParser.tag}...${rightParser.tag}`,
		(_, [_left, value, _right]) => yay(value),
	);
}

export function surrounded<T>(
	delimiter: Lexer<any>,
	content: Lexer<T>,
): Parser<T> {
	return between(delimiter, delimiter, content);
}
