/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { identifier, optional } from "@kuristina/commands";
import { ErrorMessage, Theme } from "@kuristina/discord-ui";
import { commandRegistry, defineCommand } from "@kuristina/commands/registry";

interface HelpCardProps {
	commands: Array<{ name: string; description: string }>;
}

function HelpCard({
	commands,
}: HelpCardProps) {
	const len = Math.max(
		...commands.map((cmd) => cmd.name.length),
	);

	return (
		<message>
			<h3>List of commands</h3>
			<section>
				<sub>
					<ul>
						{commands.map((cmd) => (
							<li>
								<strong>
									<code>{cmd.name.padEnd(len, " ")}</code>
								</strong>
								{"    " + cmd.description}
							</li>
						))}
					</ul>
				</sub>

				<p>
					Use <kbd>{Theme.prefix}help &lt;name&gt;</kbd>{" "}
					to view more information about a specific command.
				</p>
			</section>
			<section>
				<sub>
					<a href={Theme.branding.repoUrl}>{Theme.branding.name}</a>{" "}
					is free source software licensed under the{" "}
					<a href={Theme.branding.licenseUrl}>{Theme.branding.licenseName}</a>
				</sub>
			</section>
		</message>
	);
}

interface CommandDetailProps {
	name: string;
	description: string;
	usage?: string;
	examples?: string[];
	aliases?: string[];
	permissions?: string[];
}

function CommandDetail({
	name,
	description,
	usage,
	examples,
	aliases,
	permissions,
}: CommandDetailProps) {
	return (
		<message>
			<h3>
				<strong>
					<kbd>{name}</kbd>
				</strong>
			</h3>
			<section>
				<p>{description}</p>
				{usage && (
					<>
						<p>
							<strong>Usage:</strong> <kbd>{usage}</kbd>
						</p>
					</>
				)}
				{aliases && aliases.length > 0 && (
					<>
						<p>
							<strong>Aliases</strong>
							{aliases.map((a) =>
								// deno-lint-ignore jsx-key
								<kbd>${a}</kbd>
							).join(" ")}
						</p>
					</>
				)}
			</section>
			{examples && examples.length > 0 && (
				<section>
					<p>
						<strong>Examples:</strong>
					</p>
					<ul>
						{examples.map((ex) => (
							<li>
								<code>{ex}</code>
							</li>
						))}
					</ul>
				</section>
			)}
			{permissions && permissions.length > 0 && (
				<section>
					<sub>Required permissions: {permissions.join(", ")}</sub>
				</section>
			)}
		</message>
	);
}

export default defineCommand("help", {
	$: optional(identifier),
}, async (ctx) => {
	if (ctx.remaining) {
		const needle = ctx.remaining.toLowerCase();

		const cmd = commandRegistry.commands.find((c) =>
			c.aliases.some((a) => a.toLowerCase() === needle)
		);

		if (!cmd) {
			return void await ctx.reply(
				<ErrorMessage title="uh oh :(">
					Command{" "}
					<strong>
						<kbd>{needle}</kbd>
					</strong>{" "}
					not found. Pwease, contact a developer if you firmly believe this is a mistake.
				</ErrorMessage>,
			);
		}

		return void await ctx.reply(
			<CommandDetail
				name={cmd.aliases[0]}
				description={cmd.description || "No description available"}
				aliases={cmd.aliases.slice(1)}
			/>,
		);
	}

	await ctx.reply(
		<HelpCard
			commands={commandRegistry.commands.map((cmd) => ({
				name: cmd.aliases[0],
				description: cmd.description || "No description available",
			}))}
		/>,
	);
});
