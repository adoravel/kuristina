/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { parseColour } from "@kuristina/core";

import {
	attempt,
	few,
	literal,
	optional,
	pattern,
	pick,
	sepBy1,
	whitespace,
} from "./constructions.ts";
import { identifier, number } from "./primitives.ts";
import type { Parser } from "./parse.ts";
import { error, yay } from "./error.ts";

function colourFn(): Parser<string> {
	const name = pick("oklch", "oklab", "rgb", "hsl", "hwb", "lab", "lch");
	const open = literal("(");
	const close = literal(")");

	const value = pick(
		number,
		number.map("percentage", (_, n) => yay(`${n}%`)),
	);

	const separator = pick(
		few(literal(","), optional(whitespace)),
		whitespace,
	);

	const values = sepBy1(value, separator);

	return few(name, open, values, close).map(
		"colour_fn",
		(_, [name, , values]) => yay(`${name}(${values.join(", ")})`),
	);
}

function hexColour(): Parser<string> {
	const hexDigits = pattern(/[0-9a-fA-F]+/);

	const hex6 = hexDigits.map("hex6", (stream, digits) => {
		if (digits.length === 6) {
			return yay(`#${digits}`);
		}
		if (digits.length === 3) {
			const expanded = digits.split("").map((c) => c + c).join("");
			return yay(`#${expanded}`);
		}
		return error(stream, `invalid hex colour`, ["6 or 3 hex digits"]);
	});

	return optional(literal("#"))
		.map("hex", (stream, _) => {
			const result = attempt(hex6)(stream);
			if (result.kind === "success") return result;

			return error(stream, "invalid hex colour", ["#FF69B4 or #F69"]);
		});
}

/**
 * Parses a named CSS colour (red, hotpink, rebeccapurple)
 */
const namedColour: Parser<string> = identifier.map("named", (stream, name) => {
	const test = parseColour(name);
	return test
		? yay(name)
		: error(stream, `"${name}" is not a valid CSS colour name`, ["a CSS colour name"]);
});

export const colour: Parser<number> = pick(hexColour(), colourFn(), namedColour)
	.map(
		"colour",
		(stream, value) => {
			const parsed = parseColour(value);
			if (parsed === undefined) {
				return error(
					stream,
					`"${value}" isn't a valid colour`,
					[
						"a hex colour like #FF69B4 or #F69",
						"a CSS colour name like hotpink or rebeccapurple",
						"rgb/hsl like rgb(255, 105, 180) or hsl(330, 100%, 71%)",
					],
				);
			}
			return yay(parsed);
		},
	);
