/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
	attempt,
	digit,
	error,
	few,
	identifier,
	infer,
	insensitive,
	literal,
	many,
	optional,
	pick,
	sequence,
	skipWhitespace as skip,
	StringStream,
	toParser,
	word,
	yay,
} from "@kuristina/commands";
import type { Lexer, Parser, ParsingResult } from "@kuristina/commands";
import type { ArgsShape } from "./spec.ts";
import { getConfig } from "@kuristina/config";
import type { ArgDef } from "./argument.ts";

const escape = few(literal("\\"), pick('"', "\\", "n", "t", "r")).map(
	"escape",
	(_, [, char]) => yay(char === "n" ? "\n" : char === "t" ? "\t" : char === "r" ? "\r" : char),
);

const quoted = (delimiter: string) =>
	few(
		literal(delimiter),
		many(pick(
			escape,
			toParser((stream) => {
				const char = stream.peek();
				if (!char || char === delimiter) {
					return error(stream, "unterminated quoted string", ["character (not delimiter)"]);
				}
				return stream.advance(), yay(char);
			}, "quoted_inner"),
		)),
		literal(delimiter),
	).map(`quoted(${delimiter})`, (_, [, chars]) => yay(chars.join("")));

const quotedString = pick(quoted('"'), quoted("'"));
const rawToken = pick(quotedString, word);

const flag = (name: string): Parser<string> =>
	few(literal("-"), insensitive(name)).map(`flag(-${name})`, (_, [, f]) => yay(f));

const positional = <T>(name: string, kind: Lexer<T>) =>
	few(skip, flag(name), pick(skip, literal("=")), kind).map(
		`arg(-${name})`,
		(_, [, , , value]) => yay(value),
	);

export interface ParsedTextArgs {
	args: Record<string, unknown>;
	remaining: string;
}

const isArgumentInclusive = (def: ArgDef<any, any>) =>
	def.surfaces == null || def.surfaces.includes("both") || def.surfaces.includes("text");

export function buildTextArgsParser(
	argSpecs: ArgsShape,
): { parser: Parser<ParsedTextArgs>; args: ArgsShape } {
	const entries = Object.entries(argSpecs).filter(([_, def]) => isArgumentInclusive(def));

	const attempted = entries.map(([name, def]) => ({
		name,
		required: def.required && !def.greedy,
		parser: attempt(positional(name, def.textParser)),
	}));

	return {
		args: Object.fromEntries(entries),
		parser: toParser((stream) => {
			const values: Record<string, unknown> = {};
			const remainingParts: string[] = [];

			while (!stream.isEOF()) {
				stream.skipWhitespace();
				if (stream.isEOF()) break;

				const matchedFlag = attempted.find(({ name, parser }) => {
					const at = parser(stream);
					if (!infer("success")(at)) return false;
					values[name] = at.data;
					return true;
				});
				if (matchedFlag) continue;

				const tok = rawToken(stream);
				if (!infer("success")(tok)) return tok as ParsingResult<never>;
				remainingParts.push(tok.data);
			}

			const missing = entries.find(([name, def]) => def.required && !(name in values));
			if (missing && !missing[1].greedy) {
				return error(stream, `missing required argument -${missing[0]}`, [`-${missing[0]}`]);
			}

			return yay({ args: values, remaining: remainingParts.join(" ") });
		}, "text_args") as Parser<ParsedTextArgs>,
	};
}

export const snowflake = sequence(digit).map(
	"snowflake",
	(stream, digits) => {
		const id = digits.join("");
		if (Number.isSafeInteger(id)) {
			return error(
				stream,
				`invalid snowflake: ${id}`,
				["valid snowflake (within uint64 range)"],
			);
		}
		return yay(BigInt(id));
	},
);

export const mention = few(literal("<@"), snowflake, literal(">")).map(
	"snowflake",
	(_, [, id]) => yay(id),
);

export const roleMention = few(
	literal("<@&"),
	snowflake,
	literal(">"),
).map(
	"role_mention",
	(_, [, id]) => yay(id),
);

export const channelMention = few(
	literal("<#"),
	snowflake,
	literal(">"),
).map(
	"channel_mention",
	(_, [, id]) => yay(id),
);

export const userId = pick(mention, snowflake);

export const memberId = pick(mention, snowflake);

export const memberIds = few(
	pick(mention, snowflake),
	many(
		few(skip, pick(mention, snowflake))
			.map("additional_member", (_, [, id]) => yay(id)),
	),
).map("member_ids", (_, [head, tail]) => yay([head, ...tail]));

export const emoji = few(
	literal("<"),
	optional(literal("a")),
	literal(":"),
	identifier,
	literal(":"),
	snowflake,
	literal(">"),
).map(
	"emoji",
	(_, [, animated, , name, , id]) =>
		yay({
			name,
			id,
			animated: animated !== null,
		}),
);

export const timestamp = few(
	literal("<t:"),
	snowflake,
	optional(few(literal(":"), pick("t", "T", "d", "D", "f", "F", "R"))),
	literal(">"),
).map(
	"timestamp",
	(_, [, timestamp, format]) =>
		yay({
			timestamp,
			format: format?.[1] || "f",
		}),
);

export const COMMAND_PREFIXES = [
	"!",
	"/",
	"$",
	":3c",
	":3",
	"kuristina",
	"kuriss",
	"kuris",
	"kurie",
	"kuriis",
	"kuriiis",
	"kuriii",
	"kurii",
	"kuri",
	`<@${getConfig().discord.applicationId}>`,
];

export const prefix: Parser<string> = toParser((stream) => {
	const parser = pick(
		...COMMAND_PREFIXES.map((p) =>
			few(literal(p), optional(skip)).map("prefix", (_, [matched]) => yay(matched))
		),
	);
	return parser(stream);
}, "prefix");

export { StringStream };
