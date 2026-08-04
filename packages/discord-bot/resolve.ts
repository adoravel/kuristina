/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { safePromise, tap, withRetry } from "@kuristina/core";
import discord from "@kuristina/discord-bot";
import type { Channel, Guild, Member, Role, User } from "@kuristina/discord-bot";
import { config } from "@kuristina/config";
import { type BigString, BitwisePermissionFlags } from "./types.ts";

export type HydratedMember = Member & { user: User };

async function hydrate(member: Member): Promise<HydratedMember> {
	if (!member.user) {
		const user = await safePromise(discord.helpers.getUser(member.id));
		tap(user)((user) => member.user = user);
	}
	return member as HydratedMember;
}

export async function resolveUser(
	id: bigint,
): Promise<User | undefined> {
	const cached = await discord.cache.users.get(id);
	if (cached) return cached;

	return withRetry(() => discord.helpers.getUser(id));
}

export async function resolveMember(
	id: bigint,
	guildId = config.discord.guildId,
): Promise<HydratedMember | undefined> {
	const cached = await discord.cache.members.get(id, guildId);
	if (cached) return hydrate(cached);

	const fetched = await safePromise(
		withRetry(() => discord.helpers.getMember(guildId, id)),
	);
	if (!fetched.ok) return undefined;
	return fetched ? hydrate(fetched.value) : undefined;
}

export async function resolveRole(
	id: bigint,
	guildId = config.discord.guildId,
): Promise<Role | undefined> {
	const cached = await discord.cache.roles.get(id, guildId);
	if (cached) return cached;

	const fetched = await safePromise(withRetry(() => discord.helpers.getRole(guildId, id)));
	return fetched.ok ? fetched.value : undefined;
}

export async function resolveChannel(id: bigint): Promise<Channel | undefined> {
	const cached = await discord.cache.channels.get(id);
	if (cached) return cached;

	const fetched = await safePromise(withRetry(() => discord.helpers.getChannel(id)));
	return fetched.ok ? fetched.value : undefined;
}

export async function resolveGuild(
	id: bigint = config.discord.guildId,
): Promise<Guild> {
	const cached = await discord.cache.guilds.get(id);
	if (cached) return cached as unknown as Guild;

	const fetched = await safePromise(withRetry(() => discord.helpers.getGuild(id)));
	if (!fetched.ok) throw fetched.error;
	return fetched.value as unknown as Guild;
}

export async function resolveMembers(
	ids: bigint[],
	guildId = config.discord.guildId,
): Promise<HydratedMember[]> {
	if (!ids.length) return [];
	if (ids.length === 1) {
		const member = await resolveMember(ids[0], guildId);
		return member ? [member] : [];
	}

	const cached: HydratedMember[] = [], missing: bigint[] = [];

	for (const id of ids) {
		const member = await discord.cache.members.get(id, guildId);
		if (member) {
			cached.push(await hydrate(member));
		} else {
			missing.push(id);
		}
	}

	if (!missing.length) return cached;

	const fetched = await safePromise(
		withRetry(
			async () => {
				const members = await discord.gateway.requestMembers(guildId, {
					userIds: missing,
					limit: missing.length,
				});

				if (!members.length) throw new Error(`no members found: ${missing.join(", ")}`);
				return members as any as Member[];
			},
			{ retryIf: (e) => !(e instanceof Error && e.message.startsWith("no members found")) },
		),
	);

	if (!fetched.ok) {
		logger.boo("resolve: failed to fetch members: " + fetched.error.message);
		return cached;
	}

	return [...cached, ...await Promise.all(fetched.value.map(hydrate))];
}

function convertToBitfield(permission: any): bigint {
	if (!permission) return 0n;

	if (typeof permission === "bigint" || typeof permission === "number") {
		return BigInt(permission);
	}

	if (Array.isArray(permission)) {
		let bitfield = 0n;
		const len = permission.length;
		for (let i = 0; i < len; i++) {
			const flag = BitwisePermissionFlags[permission[i] as keyof typeof BitwisePermissionFlags];
			if (flag !== undefined) {
				bitfield |= BigInt(flag);
			}
		}
		return bitfield;
	}

	return 0n;
}

export function calculatePermissions(
	guild: Guild,
	member: Member,
	channel?: Channel,
): bigint {
	if (member.id === guild.ownerId) return BitwisePermissionFlags.ADMINISTRATOR;
	let permissions = guild.roles.get(guild.id)?.permissions.bitfield ?? 0n;

	const memberRoles = member.roles;
	const totalRoles = memberRoles.length;

	for (let i = 0; i < totalRoles; i++) {
		const role = guild.roles.get(memberRoles[i]);
		if (role) permissions |= role.permissions.bitfield;
	}

	if (
		(permissions & BitwisePermissionFlags.ADMINISTRATOR) === BitwisePermissionFlags.ADMINISTRATOR
	) {
		return BitwisePermissionFlags.ADMINISTRATOR;
	}

	if (!channel || !channel.permissionOverwrites) {
		return permissions;
	}

	const overwrites = channel.permissionOverwrites;
	const totalOverwrites = overwrites.length;

	let everyoneOverwrite: typeof overwrites[0] | undefined;
	let memberOverwrite: typeof overwrites[0] | undefined;
	let roleAllow = 0n;
	let roleDeny = 0n;

	const roles = new Set<BigString>(memberRoles);
	const guildId = guild.id.toString();
	const memberId = member.id.toString();

	for (let i = 0; i < totalOverwrites; i++) {
		const overwrite = overwrites[i];
		const targetId = overwrite.id?.toString();

		if (overwrite.id === guildId) {
			everyoneOverwrite = overwrite;
		} else if (targetId === memberId) {
			memberOverwrite = overwrite;
		} else if (roles.has(targetId)) {
			roleAllow |= convertToBitfield(overwrite.allow);
			roleDeny |= convertToBitfield(overwrite.deny);
		}
	}

	if (everyoneOverwrite) {
		permissions &= ~convertToBitfield(everyoneOverwrite.deny);
		permissions |= convertToBitfield(everyoneOverwrite.allow);
	}

	permissions &= ~roleDeny;
	permissions |= roleAllow;

	if (memberOverwrite) {
		permissions &= ~convertToBitfield(memberOverwrite.deny);
		permissions |= convertToBitfield(memberOverwrite.allow);
	}

	return permissions;
}

export async function hasChannelPermission(
	guildId: bigint,
	channelId: bigint,
	permissionFlag: bigint,
): Promise<boolean> {
	const guild = await resolveGuild(guildId);
	const bot = await resolveMember(discord.id, guildId);
	const channel = await resolveChannel(channelId);

	if (!guild || !bot || !channel) return false;

	const currentPermissions = calculatePermissions(guild, bot, channel);
	return (currentPermissions & permissionFlag) === permissionFlag;
}
