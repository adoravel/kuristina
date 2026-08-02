/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { CommandExecutionContext } from "./context.tsx";
import type { Middleware } from "./middleware.ts";
import { command, type CommandParser } from "./parser.ts";

type BaseArgs = Record<string, any>;

export interface CommandMetadata<Args extends BaseArgs = BaseArgs, R = string> {
	readonly aliases: string[];
	readonly parse: CommandParser<Args, R>;
	readonly description?: string;
	readonly category?: string;
	readonly cooldownMs?: number;
	readonly middleware?: Middleware[];

	readonly subcommands?: Map<string, CommandMetadata<any, any>>;

	exec(ctx: CommandExecutionContext<Args, R>): Promise<void>;
}

export interface DefineCommandOptions<Args extends BaseArgs = BaseArgs, R = string>
	extends Partial<Omit<CommandMetadata<Args, R>, "subcommands">> {
	subcommands?: CommandMetadata<any, any>[];
}

export function defineCommand<Args extends BaseArgs>(
	aliases: string[] | string,
	args: Args,
	exec: (
		ctx: CommandExecutionContext<Omit<Args, "$">, Args["$"]>,
	) => Promise<void>,
	options?: DefineCommandOptions<Omit<Args, "$">, Args["$"]>,
): CommandMetadata<Omit<Args, "$">, Args["$"]> {
	aliases = typeof aliases === "string" ? [aliases] : aliases;

	const { $: remaining, ...namedArgs } = args;

	const parser = command(
		namedArgs,
		remaining,
	) as CommandParser<Omit<Args, "$">, Args["$"]>;

	const { subcommands: sub, ...rest } = options ?? {};

	const subcommands = sub?.length
		? new Map(sub.flatMap((s) => s.aliases.map((alias) => [alias, s] as const)))
		: undefined;

	return {
		aliases,
		parse: parser,
		exec,
		...rest,
		subcommands,
	};
}
