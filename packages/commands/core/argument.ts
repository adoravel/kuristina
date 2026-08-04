/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ApplicationCommandOptionTypes } from "@discordeno/types";
import type { DiscordApplicationCommandOptionChoice } from "@discordeno/types";
import {
	colour as colourParser,
	greedyString,
	identifier,
	int,
	type Parser,
	pick,
	quotedString,
	yay,
} from "@kuristina/commands";
import { parseColour } from "@kuristina/core";
import { channelMention, mention as userMention, roleMention, snowflake } from "./text-args.ts";
import type { CommandSurface } from "./spec.ts";

export interface AutocompleteRequest<Args = Record<string, unknown>> {
	readonly input: string;
	readonly partialArgs: Partial<Args>;
	readonly userId: bigint;
	readonly guildId?: bigint;
}

export type AutocompleteHandler<Args = Record<string, unknown>> = (
	reuest: AutocompleteRequest<Args>,
) => Promise<DiscordApplicationCommandOptionChoice[]>;

export interface ArgDef<T, Req extends boolean = boolean> {
	readonly description: string;
	readonly required: Req;
	readonly slashType: ApplicationCommandOptionTypes;
	readonly textParser: Parser<T>;
	readonly choices?: DiscordApplicationCommandOptionChoice[];
	readonly minValue?: number;
	readonly maxValue?: number;
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly autocomplete?: AutocompleteHandler;
	readonly greedy?: boolean;
	readonly surfaces?: CommandSurface[];

	readonly fromSlashValue?: (raw: unknown) => T;
}
export const arg = {
	string<Req extends boolean = false>(opts: {
		description: string;
		required?: Req;
		minLength?: number;
		maxLength?: number;
		choices?: readonly string[];
		autocomplete?: AutocompleteHandler;
		greedy?: boolean;
		surfaces?: ("text" | "slash")[];
	}): ArgDef<string, Req extends true ? true : false> {
		if (opts.choices && opts.autocomplete) {
			throw new Error("arg.string(): choices and autocomplete are mutually exclusive");
		}
		let textParser: Parser<string>;
		if (opts.choices) {
			textParser = pick(...opts.choices);
		} else if (opts.greedy) {
			textParser = greedyString;
		} else {
			textParser = pick(quotedString, identifier);
		}
		return {
			description: opts.description,
			required: (opts.required ?? false) as Req extends true ? true : false,
			slashType: ApplicationCommandOptionTypes.String,
			textParser,
			choices: opts.choices?.map((c) => ({ name: c, value: c })),
			minLength: opts.minLength,
			maxLength: opts.maxLength,
			autocomplete: opts.autocomplete,
			greedy: opts.greedy,
			surfaces: opts.surfaces ?? ["both"],
		};
	},

	integer<Req extends boolean = false>(opts: {
		description: string;
		required?: Req;
		minValue?: number;
		maxValue?: number;
		choices?: { name: string; value: number }[];
		greedy?: boolean;
		surfaces?: ("text" | "slash")[];
	}): ArgDef<number, Req extends true ? true : false> {
		return {
			description: opts.description,
			required: (opts.required ?? false) as Req extends true ? true : false,
			slashType: ApplicationCommandOptionTypes.Integer,
			textParser: int,
			choices: opts.choices,
			minValue: opts.minValue,
			maxValue: opts.maxValue,
			greedy: opts.greedy,
			surfaces: opts.surfaces ?? ["both"],
		};
	},

	boolean<Req extends boolean = false>(
		opts: { description: string; required?: Req; surfaces?: ("text" | "slash")[] },
	): ArgDef<boolean, Req extends true ? true : false> {
		return {
			description: opts.description,
			required: (opts.required ?? false) as Req extends true ? true : false,
			slashType: ApplicationCommandOptionTypes.Boolean,
			textParser: pick("true", "yes", "false", "no").map(
				"boolean",
				(_, v) => yay(v === "true" || v === "yes"),
			),
			surfaces: opts.surfaces ?? ["both"],
		};
	},

	user<Req extends boolean = false>(
		opts: { description: string; required?: Req; surfaces?: ("text" | "slash")[] },
	): ArgDef<bigint, Req extends true ? true : false> {
		return {
			description: opts.description,
			required: (opts.required ?? false) as Req extends true ? true : false,
			slashType: ApplicationCommandOptionTypes.User,
			textParser: pick(userMention, snowflake),
			fromSlashValue: (v) => BigInt(v as string | bigint),
			surfaces: opts.surfaces ?? ["both"],
		};
	},

	role<Req extends boolean = false>(
		opts: { description: string; required?: Req; surfaces?: ("text" | "slash")[] },
	): ArgDef<bigint, Req extends true ? true : false> {
		return {
			description: opts.description,
			required: (opts.required ?? false) as Req extends true ? true : false,
			slashType: ApplicationCommandOptionTypes.Role,
			textParser: pick(roleMention, snowflake),
			fromSlashValue: (v) => BigInt(v as string | bigint),
			surfaces: opts.surfaces ?? ["both"],
		};
	},

	channel<Req extends boolean = false>(
		opts: { description: string; required?: Req; surfaces?: ("text" | "slash")[] },
	): ArgDef<bigint, Req extends true ? true : false> {
		return {
			description: opts.description,
			required: (opts.required ?? false) as Req extends true ? true : false,
			slashType: ApplicationCommandOptionTypes.Channel,
			textParser: pick(channelMention, snowflake),
			fromSlashValue: (v) => BigInt(v as string | bigint),
			surfaces: opts.surfaces ?? ["both"],
		};
	},

	colour<Req extends boolean = false>(
		opts: {
			description: string;
			required?: Req;
			greedy?: boolean;
			surfaces?: ("text" | "slash")[];
		},
	): ArgDef<number, Req extends true ? true : false> {
		return {
			description: opts.description,
			required: (opts.required ?? false) as Req extends true ? true : false,
			slashType: ApplicationCommandOptionTypes.String,
			textParser: colourParser,
			greedy: opts.greedy,
			fromSlashValue: (v) => {
				const parsed = parseColour(v as string);
				if (parsed === undefined) throw new Error(`"${v}" isn't a valid colour`);
				return parsed;
			},
			surfaces: opts.surfaces ?? ["both"],
		};
	},
} as const;

export const {
	string,
	integer,
	boolean,
	user,
	role,
	channel,
	colour,
} = arg;
