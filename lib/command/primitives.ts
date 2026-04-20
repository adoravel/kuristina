/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
	few,
	literal,
	many,
	optional,
	pick,
	sequence,
	skipWhitespace,
} from "~/lib/combinators/constructions.ts";
import { error, yay } from "~/lib/combinators/mod.ts";
import { digit, identifier } from "~/lib/combinators/primitives.ts";
import { getConfig } from "~/config/mod.ts";

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
		few(skipWhitespace, pick(mention, snowflake))
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

export const prefix = pick(
	...["/", "$", "kuristina", `<@${getConfig().discord.applicationId}>`].map((
		prefix,
	) =>
		few(literal(prefix), optional(skipWhitespace)).map(
			"prefix",
			(_, [prefix]) => yay(prefix),
		)
	),
);
