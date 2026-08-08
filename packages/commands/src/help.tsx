import { arg, defineCommand, getAllCommands } from "@kuristina/commands/core";
import type { CommandSpec, Invocation } from "@kuristina/commands/core";
import { cancelWaiter, waitForInteraction } from "@kuristina/core";
import { ButtonStyles, type CreateMessageOptions, type Interaction } from "@kuristina/discord-bot";
import { Theme } from "@kuristina/discord-ui";

const HELP_TIMEOUT_MS = 120_000;

function isOwnerOnly(cmd: CommandSpec<any>): boolean {
	return cmd.middleware.some((m) => m.name === "owner-only");
}

function groupByCategory(commands: readonly CommandSpec<any>[]): Map<string, CommandSpec<any>[]> {
	const groups = new Map<string, CommandSpec<any>[]>();
	for (const cmd of commands) {
		if (isOwnerOnly(cmd) || !cmd.category) continue;
		const { category } = cmd;
		if (!groups.has(category)) groups.set(category, []);
		groups.get(category)!.push(cmd);
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
	groups: Map<string, CommandSpec<any>[]>,
	page: number,
): CreateMessageOptions {
	const categoryKey = categories[page];
	const commands = groups.get(categoryKey)!;

	const categoryName = formatCategoryName(categoryKey);

	const maxAliasLength = Math.max(...commands.map((c) => c.aliases[0].length));
	const paddedLength = maxAliasLength + 4;

	return (
		<message>
			<h3>
				<icon name="help" />
				{` ${categoryName}`} ({page + 1}/{categories.length})
			</h3>
			<hr spacing={2} />
			<sub>
				<ul>
					{commands.map((c) => {
						const centeredAlias = centerString(c.aliases[0], paddedLength);
						return (
							<li>
								<strong>
									<kbd>{centeredAlias}</kbd>
								</strong>
								{`  `}
								{c.description}
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
	groups: Map<string, CommandSpec<any>[]>,
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
			prevP.then(() => "prev" as const),
			nextP.then(() => "next" as const),
			closeP.then(() => "close" as const),
		]).catch(() => "timeout" as const);

		cancelWaiter(prevId);
		cancelWaiter(nextId);
		cancelWaiter(closeId);

		if (winner === "prev") page = Math.max(0, page - 1);
		else if (winner === "next") page = Math.min(categories.length - 1, page + 1);
		else return;
	}
}

function findCommand(needle: string): CommandSpec<any> | undefined {
	return getAllCommands().find(($) =>
		!isOwnerOnly($) && $.aliases.some((a) => a.toLowerCase() === needle)
	);
}

export default defineCommand({
	aliases: "help",
	description: "Lists commands, browsable by category, or shows detail for one.",
	args: {
		command: arg.string({ description: "command name" }),
		subcommand: arg.string({ description: "subcommand name, if the command has one" }),
	},
	async exec(ctx) {
		if (!ctx.args.command) {
			const groups = groupByCategory(getAllCommands());
			const categories = [...groups.keys()].sort().reverse();
			if (!categories.length) return void await ctx.reply({ content: "no commands registered" });
			await runCategoryBrowser(ctx, categories, groups);
			return;
		}

		const cmd = findCommand(ctx.args.command.toLowerCase());
		if (!cmd) return void await ctx.error(`command \`${ctx.args.command}\` not found`);

		const target = ctx.args.subcommand
			? cmd.subcommands?.find((s) =>
				s.aliases.some((a) => a.toLowerCase() === ctx.args.subcommand!.toLowerCase())
			)
			: cmd;

		if (ctx.args.subcommand && !target) {
			return void await ctx.error(
				`\`${cmd.aliases[0]}\` has no subcommand \`${ctx.args.subcommand}\``,
			);
		}

		await ctx.reply({
			content: (
				<>
					<h3>
						<icon name="help" />{"  "}
						<strong>
							<kbd>{target!.aliases[0]}</kbd>
						</strong>
					</h3>
					<hr spacing={2} />
					<p>{target!.description}</p>
					{target!.aliases.length > 1 && (
						<p>
							<strong>Aliases</strong>{" "}
							{target!.aliases.slice(1).map((a) => <kbd>{a}</kbd>).join(" ")}
						</p>
					)}
					{target === cmd && cmd.subcommands?.length && (
						<p>
							<strong>Subcommands</strong>{" "}
							{cmd.subcommands.filter((s) => !isOwnerOnly(s)).map((s) => <kbd>{s.aliases[0]}</kbd>)
								.join(" ")}
							<sub>
								&nbsp;· use <kbd>{Theme.prefix}help {cmd.aliases[0]} &lt;subcommand&gt;</kbd>{" "}
								for details
							</sub>
						</p>
					)}
				</>
			),
		});
	},
});
