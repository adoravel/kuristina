/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { optional } from "~/lib/combinators/constructions.ts";
import { commandRegistry, defineCommand } from "~/lib/command/registry.tsx";
import { identifier } from "~/lib/combinators/primitives.ts";
import { Card, ErrorMessage, Heading, List, Section, Subtext, TextDisplay } from "~/lib/ui";
import { getConfig } from "~/config/mod.ts";

interface HelpCardProps {
	commands: Array<{ name: string; description: string }>;
}

function HelpCard({
	commands,
}: HelpCardProps) {
	const len = Math.max(
		...commands.map((cmd) => cmd.name.length),
	);
	const cmds = commands.map((cmd) =>
		`**\` ${cmd.name.padEnd(len, " ")} \`**    ${cmd.description}`
	);

	return (
		<Card>
			<Heading level={3} emoji={getConfig().emojis.success}>
				List of commands
			</Heading>
			<Section>
				<List items={cmds} bullet="-# -" />
				<TextDisplay>
					&lt;:cord:1429507932864647239&gt; Use `kuristina help &lt;name&gt;` to view more
					information about a specific command.
				</TextDisplay>
			</Section>
			<Section>
				<Subtext>
					[kuristina](https://github.com/adoravel/kuristina) is free source software licensed under
					the [GNU Affero General Public License
					v3.0](https://spdx.org/licenses/AGPL-3.0-or-later.html).
				</Subtext>
			</Section>
		</Card>
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
		<Card>
			<TextDisplay>
				### {getConfig().emojis.success} **`{name}`**
			</TextDisplay>
			<Section>
				<TextDisplay>{description}</TextDisplay>
				{usage && (
					<>
						<TextDisplay>**Usage:** `{usage}`</TextDisplay>
					</>
				)}
				{aliases && aliases.length > 0 && (
					<>
						<TextDisplay>
							**Aliases:** {aliases.map((a) => `\`${a}\``).join(", ")}
						</TextDisplay>
					</>
				)}
			</Section>
			{examples && examples.length > 0 && (
				<Section>
					<TextDisplay>**Examples:**</TextDisplay>
					<List items={examples.map((ex) => `\`${ex}\``)} />
				</Section>
			)}
			{permissions && permissions.length > 0 && (
				<Section>
					<Subtext>Required permissions: {permissions.join(", ")}</Subtext>
				</Section>
			)}
		</Card>
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
					Command **`{needle}`** not found. Pwease, contact a developer if you firmly believe this
					is a mistake.
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
