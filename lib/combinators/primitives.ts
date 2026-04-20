/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Parser, toParser, unexpectedSymbol, yay } from "./mod.ts";
import { pick, range } from "./constructions.ts";

export { $ } from "./stream.ts";

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const digit = range("0", "9") as Parser<`${Digit}`>;

export const nat = toParser((stream) => {
	const digits = stream.consumeWhile((c) => c >= "0" && c <= "9");
	if (!digits.length) {
		return unexpectedSymbol(stream, ["digit"]);
	}
	return yay(parseInt(digits, 10));
}, "nat") as Parser<number>;

export const int = toParser((stream) => {
	const sign = stream.peek();

	if (sign === "+" || sign === "-") {
		stream.advance();
	}

	const result = nat(stream);
	if (result?.kind !== "success") {
		return result;
	}
	return yay(sign === "-" ? -result.data : result.data);
}, "int");

export const binary = toParser((stream) => {
	if (stream.matches("0b") || stream.matches("0B")) {
		stream.advance();
		stream.advance();
	} else {
		return unexpectedSymbol(stream, ["binary digit"]);
	}
	const digits = stream.consumeWhile((c) => c === "0" || c === "1");
	if (!digits.length) {
		return unexpectedSymbol(stream, ["binary digit"]);
	}
	return yay(parseInt(digits, 2));
}, "binary");

export const hex = toParser((stream) => {
	if (stream.matches("#")) {
		stream.advance();
	} else if (stream.matches("0x") || stream.matches("0X")) {
		stream.advance();
		stream.advance();
	} else {
		return unexpectedSymbol(stream, ["hex digit"]);
	}
	const digits = stream.consumeWhile((c) => /[0-9a-fA-F]/.test(c));
	if (!digits.length) {
		return unexpectedSymbol(stream, ["hex digit"]);
	}
	return yay(parseInt(digits, 16));
}, "hex");

export const octal = toParser((stream) => {
	if (stream.matches("0o") || stream.matches("0O")) {
		stream.advance();
		stream.advance();
	} else {
		return unexpectedSymbol(stream, ["octal digit"]);
	}
	const digits = stream.consumeWhile((c) => c >= "0" && c <= "7");
	if (!digits.length) {
		return unexpectedSymbol(stream, ["octal digit"]);
	}
	return yay(parseInt(digits, 8));
}, "octal");

export const number = pick(hex, octal, binary, int);

export const lowercase = range("a", "z") as Parser<Alphabet>;
export const uppercase = range("A", "Z") as Parser<Uppercase<Alphabet>>;
export const alpha = pick(lowercase, uppercase);
export const alphanumeric = pick(alpha, digit);

export const word = toParser((stream) => {
	const result = stream.consumeWhile((c) => !/\s/.test(c));

	if (result.length === 0) {
		return unexpectedSymbol(stream, ["non-whitespace"]);
	}
	return yay(result);
}, "word");

export const identifier = toParser((stream) => {
	const first = stream.peek();

	if (!first || (!/[a-zA-Z_]/.test(first))) {
		return unexpectedSymbol(stream, ["letter or underscore"]);
	}
	const result = stream.consumeWhile((c) => /[a-zA-Z0-9_-]/.test(c));

	return yay(result);
}, "identifier");

export const greedyString = toParser((stream) => {
	const content = stream.tail();
	stream.consumeWhile(() => true);
	return yay(content);
}, "greedy");

export const line = toParser((stream) => {
	const result = stream.consumeWhile((c) => c !== "\n");
	if (stream.peek() === "\n") stream.advance();
	return yay(result);
}, "line");

type Alphabet =
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z";
