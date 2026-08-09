/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand, getAllCommands } from "@kuristina/commands/core";
import type { CommandSpec, Invocation } from "@kuristina/commands/core";
import { cancelWaiter, waitForInteraction } from "@kuristina/core";
import {
	ackDeferUpdate,
	ButtonStyles,
	type CreateMessageOptions,
	type Interaction,
} from "@kuristina/discord-bot";
import { Theme } from "@kuristina/discord-ui";

const HELP_TIMEOUT_MS = 120_000;

function isOwnerOnly(cmd: CommandSpec<any>): boolean {
	return cmd.middleware.some((m) => m.name === "owner-only");
}

interface FlattenedCommand {
	spec: CommandSpec<any>;
	path: string[];
}

function flattenLeaves(
	commands: readonly CommandSpec<any>[],
	prefix: string[] = [],
): FlattenedCommand[] {
	const out: FlattenedCommand[] = [];
	for (const cmd of commands) {
		if (isOwnerOnly(cmd)) continue;
		const path = [...prefix, cmd.aliases[0]];
		if (cmd.subcommands?.length) {
			out.push(...flattenLeaves(cmd.subcommands, path));
		} else {
			out.push({ spec: cmd, path });
		}
	}
	return out;
}

function groupByCategory(leaves: FlattenedCommand[]): Map<string, FlattenedCommand[]> {
	const groups = new Map<string, FlattenedCommand[]>();
	for (const entry of leaves) {
		if (!entry.spec.category) continue;
		if (!groups.has(entry.spec.category)) groups.set(entry.spec.category, []);
		groups.get(entry.spec.category)!.push(entry);
	}
	return groups;
}

const centerString = (text: string, length: number): string => {
	const leftPadding = Math.floor((length - text.length) / 2);
	return text.padStart(text.length + leftPadding, " ").padEnd(length, " ");
};

const formatCategoryName = (name: string): string => {
	if (name === "fm") return "Last.fm";
	return name.charAt(0).toUpperCase() + name.slice(1);
};

function renderCategoryPage(
	categories: string[],
	groups: Map<string, FlattenedCommand[]>,
	page: number,
): CreateMessageOptions {
	const categoryKey = categories[page];
	const entries = groups.get(categoryKey)!;

	const categoryName = formatCategoryName(categoryKey);

	const names = entries.map((e) => e.path.join(" "));
	const maxNameLength = Math.max(...names.map((n) => n.length));
	const paddedLength = maxNameLength + 4;

	return (
		<message>
			<h3>
				<icon name="help" />
				{` ${categoryName}`} ({page + 1}/{categories.length})
			</h3>
			<hr spacing={2} />
			<sub>
				<ul>
					{entries.map((e, i) => {
						const centeredName = centerString(names[i], paddedLength);
						return (
							<li>
								<strong>
									<kbd>{centeredName}</kbd>
								</strong>
								{`  `}
								{e.spec.description}
							</li>
						);
					})}
				</ul>
			</sub>
			<p>Use `{Theme.prefix}help &lt;name&gt;` for details on a specific command.</p>
			<hr spacing={2} />
			<sub>
				<a href={Theme.branding.repoUrl}>{Theme.branding.name}</a>{" "}
				is free and open-source software licensed under the{" "}
				<a href={Theme.branding.licenseUrl}>{Theme.branding.licenseName}</a>
			</sub>
		</message>
	);
}

async function runCategoryBrowser(
	ctx: Invocation,
	categories: string[],
	groups: Map<string, FlattenedCommand[]>,
): Promise<void> {
	let page = 0;

	while (true) {
		const message = renderCategoryPage(categories, groups, page);

		const { customId: prevId, promise: prevP } = waitForInteraction<Interaction>(
			"help-prev",
			HELP_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);
		const { customId: nextId, promise: nextP } = waitForInteraction<Interaction>(
			"help-next",
			HELP_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);
		const { customId: closeId, promise: closeP } = waitForInteraction<Interaction>(
			"help-close",
			HELP_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);

		message.components?.push(
			<row>
				<button customId={prevId} style={ButtonStyles.Secondary} disabled={page === 0}>
					← Prev
				</button>
				<button
					customId={nextId}
					style={ButtonStyles.Secondary}
					disabled={page >= categories.length - 1}
				>
					Next →
				</button>
				<button customId={closeId} style={ButtonStyles.Danger}>✕</button>
			</row>,
		);
		await ctx.reply(message);

		const winner = await Promise.race([
			prevP.then((i) => ({ kind: "prev" as const, interaction: i })),
			nextP.then((i) => ({ kind: "next" as const, interaction: i })),
			closeP.then((i) => ({ kind: "close" as const, interaction: i })),
		]).catch(() => ({ kind: "timeout" as const, interaction: undefined }));

		cancelWaiter(prevId);
		cancelWaiter(nextId);
		cancelWaiter(closeId);

		if (winner.interaction) {
			await ackDeferUpdate(winner.interaction).catch((e) =>
				logger.warn("help: failed to ack pagination click:", e)
			);
		}

		if (winner.kind === "prev") page = Math.max(0, page - 1);
		else if (winner.kind === "next") page = Math.min(categories.length - 1, page + 1);
		else return;
	}
}

function resolvePath(tokens: string[]): CommandSpec<any> | undefined {
	if (!tokens.length) return undefined;
	let pool = getAllCommands();
	let found: CommandSpec<any> | undefined;

	for (const token of tokens) {
		found = pool.find((c) => !isOwnerOnly(c) && c.aliases.some((a) => a.toLowerCase() === token));
		if (found) pool = found.subcommands ?? [];
	}
	return found;
}

export default defineCommand({
	aliases: "help",
	description: "Lists commands, browsable by category, or shows detail for one.",
	args: {
		query: arg.string({
			description: "command name, and subcommand if it has one",
			required: false,
			greedy: true,
		}),
	},
	async exec(ctx) {
		const tokens = ctx.args.query?.trim().split(/\s+/).filter(Boolean) ?? [];

		if (!tokens.length) {
			const leaves = flattenLeaves(getAllCommands());
			const groups = groupByCategory(leaves);
			const categories = [...groups.keys()].sort().reverse();
			if (!categories.length) return void await ctx.reply({ content: "no commands registered" });

			await runCategoryBrowser(ctx, categories, groups);
			return;
		}

		const target = resolvePath(tokens);
		if (!target) {
			return void await ctx.error(`command \`${tokens.join(" ")}\` not found`);
		}

		await ctx.reply(
			<message>
				<h3>
					<icon name="help" />{"  "}
					<strong>
						<kbd>{tokens.join(" ")}</kbd>
					</strong>
				</h3>
				<hr spacing={2} />
				<p>{target.description}</p>
				{target.aliases.length > 1 && (
					<p>
						<strong>Aliases</strong> {target.aliases.slice(1).map((a) => <kbd>{a}</kbd>).join(" ")}
					</p>
				)}
				{target.subcommands?.length && (
					<p>
						<strong>Subcommands</strong>{" "}
						{target.subcommands.filter((s) => !isOwnerOnly(s)).map((s) => <kbd>{s.aliases[0]}</kbd>)
							.join(" ")}
						<sub>
							&nbsp;· use <kbd>{Theme.prefix}help {tokens.join(" ")} &lt;subcommand&gt;</kbd>{" "}
							for details
						</sub>
					</p>
				)}
			</message>,
		);
	},
});
