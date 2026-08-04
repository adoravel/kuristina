/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { colour, defineCommand } from "@kuristina/commands/core";
import { MessageComponentTypes, type Role } from "@kuristina/discord-bot";
import { setupInteractionHandler } from "@kuristina/discord-bot";

const ROLE_MARKER = ".ᐟ〃" as const;
const CUSTOM_ID_PREFIX = "kuristina_role_colour:" as const;

const encode = (id: bigint) =>
	[...String(id)].map((c) => {
		const p = c.codePointAt(0)!;
		return p < 0x80 && p > 0 ? String.fromCodePoint(p + 0xE0000) : c;
	}).join("");

const isColourRole = (role: Role): boolean => role.name.startsWith(ROLE_MARKER);

const isPersonalRole = (role: Role, id: bigint) => role.name === encode(id);

interface RoleCardProps {
	roles: Role[];
	userId: bigint;
}

function RoleCard({ roles, userId }: RoleCardProps) {
	const colourRoles = roles.filter(isColourRole);

	return (
		<message>
			<h3>Role colours</h3>
			<section>
				<p>_woah you're so colorful~_</p>
				{colourRoles.length > 0
					? (
						<select
							customId={CUSTOM_ID_PREFIX + userId}
							placeholder="Select a colour preset"
							maxValues={1}
						>
							{colourRoles.map((role) => (
								<option
									value={role.id.toString()}
									description={`#${role.colors.primaryColor.toString(16).padStart(6, "0")}`}
									emoji={role.unicodeEmoji ? { name: role.unicodeEmoji } : undefined}
								>
									{role.name}
								</option>
							))}
						</select>
					)
					: <p>_No color presets available yet!_</p>}
			</section>
			<section>
				<sub>
					• Pro tip: You can pick an arbitrary colour by running{"  "}
					<kbd>kuristina colour &lt;colour_code&gt;</kbd>.
				</sub>
				<sub>
					• Example: <kbd>kuristina colour #FF69B4</kbd> for hot pink.
				</sub>
			</section>
		</message>
	);
}

setupInteractionHandler({
	identifier: CUSTOM_ID_PREFIX,
	kind: MessageComponentTypes.StringSelect,
}, async (ctx) => {
	const [_, userId] = ctx.data!.customId!.split(":");

	if (ctx.user.id !== BigInt(userId) || !ctx.member) return;

	const { guild, member } = ctx;

	const rolesToRemove = guild.roles.filter((role) =>
		(isColourRole(role) || isPersonalRole(role, member.id)) &&
		member.roles.includes(role.id)
	);

	await Promise.all(
		rolesToRemove.map((role) =>
			ctx.bot.helpers.removeRole(guild.id, userId, role.id, "colour role update")
		),
	);
	await Promise.all(
		ctx.data!.values!.map((role) =>
			ctx.bot.helpers.addRole(guild.id, userId, role, "selected colour preset")
		),
	);

	await ctx.defer(true);
});

export default defineCommand({
	aliases: ["colour", "color", "role-color", "role-colour", "role", "hx"],
	description: "Allows the user to set an arbitrary colour as their role.",
	category: "utility",
	contexts: ["guild"],
	args: {
		value: colour({
			description: "Hex, named, or rgb()/hsl() colours",
			required: false,
			greedy: true,
		}),
	},
	async exec(ctx) {
		const guild = await ctx.getGuild();
		if (!guild) return void await ctx.error("guild context is uninitialised");

		const name = encode(ctx.user.id);
		let role = guild.roles.find((r) => r.name === name);

		if (ctx.args.value !== undefined) {
			await Promise.all(
				guild.roles.filter(isColourRole).map((r) =>
					ctx.platform.helpers.removeRole(
						guild.id,
						ctx.user.id,
						r.id,
						"arbitrary colour role update",
					)
				),
			);
			role = role
				? await ctx.platform.helpers.editRole(
					guild.id,
					role.id,
					{ color: ctx.args.value },
					"arbitrary colour role update",
				)
				: await ctx.platform.helpers.createRole(
					guild.id,
					{ name, color: ctx.args.value },
					"colour role",
				);
			await ctx.platform.helpers.addRole(guild.id, ctx.user.id, role.id);
			await ctx.success(`-# <@&${role.id}>`);
			return;
		}

		await ctx.reply(<RoleCard userId={ctx.user.id} roles={[...guild.roles.values()]} />);
	},
});
