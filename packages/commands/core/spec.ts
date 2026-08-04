/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import type { ArgDef } from "./argument.ts";
import type { CommandContextKind } from "./context-kind.ts";
import type { Invocation } from "./invocation.tsx";
import type { Middleware } from "./middleware.ts";
import { cooldown } from "@kuristina/commands/core";

export type ArgsShape = Record<string, ArgDef<any, any>>;

type InferArgType<D> = D extends ArgDef<infer T, any> ? T : never;

export type InferArgs<A extends ArgsShape> = {
	[K in keyof A]: A[K]["required"] extends false ? InferArgType<A[K]> | undefined
		: InferArgType<A[K]>;
};

export type CommandSurface = "text" | "slash" | "both";

export interface CommandSpec<A extends ArgsShape = ArgsShape> {
	readonly aliases: readonly string[];
	readonly description: string;
	readonly args?: A;
	readonly contexts?: readonly CommandContextKind[];
	readonly surfaces: CommandSurface;
	readonly category?: string;
	readonly cooldownMs?: number | null;
	readonly middleware: readonly Middleware[];
	readonly subcommands?: readonly CommandSpec<any>[];

	exec(ctx: Invocation<InferArgs<A>>): Promise<void>;
}

export interface DefineCommandOptions<A extends ArgsShape> {
	aliases: string | readonly string[];
	description: string;
	args?: A;
	contexts?: readonly CommandContextKind[];
	surfaces?: CommandSurface;
	category?: string;
	cooldownMs?: number;
	middleware?: readonly Middleware[];
	readonly subcommands?: readonly CommandSpec<any>[];

	exec(ctx: Invocation<InferArgs<A>>): Promise<void>;
}

const SLASH_NAME_RE = /^[a-z0-9_-]{1,32}$/;

function checkSubcommandDepth(
	rootName: string,
	subcommands: readonly CommandSpec<any>[],
	parentSurfaces: CommandSurface,
	depth: number,
	errors: string[],
): void {
	for (const sub of subcommands) {
		if (sub.surfaces !== parentSurfaces) {
			errors.push(
				`"${rootName}" → "${sub.aliases[0]}": a subcommand's surfaces must match its parent's ` +
					`(parent is "${parentSurfaces}", subcommand is "${sub.surfaces}")`,
			);
		}
		if (sub.subcommands?.length) {
			if (depth >= 1) {
				errors.push(
					`"${rootName}" → "${sub.aliases[0]}": Discord allows at most command → group → ` +
						`subcommand (2 levels below the root).`,
				);
				continue;
			}
			if (Object.keys(sub.args ?? {}).length) {
				errors.push(
					`"${rootName}" → "${sub.aliases[0]}" can't have both nested subcommands and its own args`,
				);
			}
			checkSubcommandDepth(rootName, sub.subcommands, parentSurfaces, depth + 1, errors);
		}
	}
}

function validate(spec: CommandSpec): void {
	const errors: string[] = [];
	const primary = spec.aliases[0];

	if (!primary) errors.push("at least one alias is required");

	if (primary && spec.surfaces !== "text" && !SLASH_NAME_RE.test(primary)) {
		errors.push(`primary alias "${primary}" isn't a valid slash command name`);
	}

	const restArgs = Object.entries(spec.args ?? {}).filter(([, def]) => def.greedy);
	if (restArgs.length > 1) {
		errors.push(`only one arg may set restOnText, found: ${restArgs.map(([n]) => n).join(", ")}`);
	}

	const hasOwnerOnly = spec.middleware.some((m) => m.ownerOnly);
	if (hasOwnerOnly && spec.surfaces !== "text") {
		errors.push(`owner-only commands must resolve to surfaces: "text" (got "${spec.surfaces}")`);
	}

	if (spec.subcommands?.length) {
		if (spec.surfaces !== "text" && Object.keys(spec.args ?? {}).length) {
			const args = Object.values(spec.args ?? {});
			const hasSlashArg = args.some(($) =>
				$.surfaces == null || $.surfaces.includes("slash") || $.surfaces.includes("both")
			);

			if (hasSlashArg) {
				errors.push(
					`"${primary}" has subcommands and a slash surface, but also declares its own args. ` +
						`Discord can't invoke a parent command directly once it has subcommands.`,
				);
			}
		}
		checkSubcommandDepth(primary, spec.subcommands, spec.surfaces, 0, errors);
	}

	if (errors.length) {
		throw new Error(`invalid command "${primary ?? "<unnamed>"}":\n  - ${errors.join("\n  · ")}`);
	}
}

export function defineCommand<A extends ArgsShape = Record<string, never>>(
	opts: DefineCommandOptions<A>,
): CommandSpec<A> {
	const aliases = typeof opts.aliases === "string" ? [opts.aliases] : opts.aliases;
	if (opts.cooldownMs === undefined) {
		opts.cooldownMs = config.commands.defaultCooldownMs;
	}

	const middleware = [...(opts.middleware ?? [])];
	if (opts.cooldownMs) middleware.push(cooldown(aliases[0], opts.cooldownMs));

	const hasOwnerOnly = middleware.some((m) => m.ownerOnly);
	const surfaces = opts.surfaces ?? (hasOwnerOnly ? "text" : "both");

	const spec: CommandSpec<A> = {
		aliases,
		description: opts.description,
		args: opts.args,
		contexts: opts.contexts ?? ["guild", "bot_dm", "private_channel"],
		surfaces,
		category: opts.category,
		cooldownMs: opts.cooldownMs,
		middleware,
		subcommands: opts.subcommands,
		exec: opts.exec,
	};

	validate(spec as CommandSpec);
	return spec;
}
