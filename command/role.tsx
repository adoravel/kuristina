/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { optional } from "~combinators/constructions.ts";
import { number } from "~combinators/primitives.ts";
import { Card, Heading, Section, Subtext } from "~jsx/components";
import { TextDisplay } from "~jsx/TextDisplay.tsx";
import { ActionRow } from "~jsx/ActionRow.tsx";
import { StringSelect } from "~jsx/StringSelect.tsx";
import { defineCommand } from "~command/registry.tsx";

import { MessageComponentTypes, Role } from "discord/types";
import { setupInteractionHandler } from "~/discord/events/interactionCreate.ts";
import { getConfig } from "~/config/mod.ts";

const ROLE_MARKER = ".ᐟ〃" as const;
const CUSTOM_ID_PREFIX = "kuristina_role_colour:" as const;

const encode = (id: bigint) =>
	[...String(id)].map((c) => {
		const p = c.codePointAt(0)!;
		return p < 0x80 && p > 0 ? String.fromCodePoint(p + 917504) : c;
	}).join("");

const isColorRole = (role: Role): boolean => role.name.startsWith(ROLE_MARKER);

const isPersonalRole = (role: Role, id: bigint) => role.name === encode(id);

interface RoleCardProps {
	roles: Role[];
	userId: bigint;
}

function RoleCard({ roles, userId }: RoleCardProps) {
	const colorRoles = roles.filter(isColorRole);

	return (
		<Card>
			<Heading level={3} emoji={getConfig().emojis.loading}>
				Role colours
			</Heading>
			<Section>
				<TextDisplay>_woah you're so colorful~_</TextDisplay>
				{colorRoles.length > 0
					? (
						<ActionRow>
							<StringSelect
								customId={CUSTOM_ID_PREFIX + userId}
								placeholder="Select a colour preset"
								maxValues={1}
							>
								{colorRoles.map((role) => ({
									label: role.name,
									description: `#${role.color.toString(16).padStart(6, "0")}`,
									emoji: role.unicodeEmoji ? { name: role.unicodeEmoji } : undefined,
									value: role.id,
								})) as any}
							</StringSelect>
						</ActionRow>
					)
					: <TextDisplay>_No color presets available yet!_</TextDisplay>}
			</Section>
			<Section>
				<Subtext>
					• Pro tip: You can pick an arbitrary colour by running `kuristina colour
					&lt;colour_code&gt;`.
				</Subtext>
				<Subtext>
					• Example: `kuristina colour #FF69B4` for hot pink.
				</Subtext>
			</Section>
		</Card>
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
		(isColorRole(role) || isPersonalRole(role, member.id)) &&
		member.roles.includes(role.id)
	);

	await Promise.all(
		rolesToRemove.map((role) =>
			ctx.bot.helpers.removeRole(guild.id, userId, role.id, "colour role update")
		),
	);
	await Promise.all(
		ctx.data!.values!.map((role) =>
			ctx.bot.helpers.addRole(guild.id, userId, role, "Selected color preset")
		),
	);

	await ctx.defer(true);
});

export default defineCommand([
	"colour",
	"color",
	"role-color",
	"role-colour",
	"role",
], {
	$: optional(number),
}, async (ctx) => {
	const guild = await ctx.getGuild();
	if (!guild) return await ctx.error("guild context is uninitialised");

	const name = encode(ctx.message.author.id);
	let role = guild.roles.find((r) => r.name === name);

	if (ctx.remaining) {
		await Promise.all(
			guild.roles.filter(isColorRole).map((r) =>
				ctx.platform.helpers.removeRole(guild.id, ctx.user.id, r.id, "arbitrary colour role update")
			),
		);
		role = role
			? await ctx.platform.helpers.editRole(
				guild.id,
				role.id,
				{ color: ctx.remaining },
				"arbitrary colour role update",
			)
			: await ctx.platform.helpers.createRole(
				guild.id,
				{ name, color: ctx.remaining },
				"colour role",
			);
		await ctx.platform.helpers.addRole(guild.id, ctx.message.author.id, role.id);
		await ctx.success(`-# <@&${role.id}>`);
		return;
	}

	await ctx.reply(
		<RoleCard
			userId={ctx.message.author.id}
			roles={[...guild.roles.values()]}
		/>,
	);
}, {
	description: "Allows the user to set an arbitrary colour as their role.",
	category: "utility",
	cooldownMs: 5000,
});
