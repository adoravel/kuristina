/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord from "~/discord/bot";
import { Channel, Guild, Member, Role, User } from "~/discord/types";
import { getConfig } from "~/config/mod.ts";

export class ResolutionError extends Error {
	constructor(
		message: string,
		public readonly id: string,
	) {
		super(message);
		this.name = "ResolutionError";
	}
}

export async function resolveUser(
	id: bigint,
): Promise<User | undefined> {
	const user = await discord.cache.users.get(id);
	if (user) return user;

	return discord.helpers.getUser(id);
}

export async function resolveMember(
	id: bigint,
	guildId = getConfig().discord.guildId,
): Promise<Member | undefined> {
	const member = await discord.cache.members.get(id, guildId);
	if (member) {
		(member as any).user = await discord.cache.users.get(member.id);
		return member;
	}

	return discord.helpers.getMember(guildId, id);
}

export async function resolveMembers(
	ids: bigint[],
	guildId = getConfig().discord.guildId,
): Promise<Member[]> {
	if (ids.length === 1) {
		const member = await resolveMember(ids[0], guildId);
		return member ? [member] : [];
	}

	const cached: Member[] = [], missing: bigint[] = [];

	for (const id of ids) {
		const member = await discord.cache.members.get(id, guildId);
		if (member) {
			(member as any).user = await discord.cache.users.get(member.id);
			cached.push(member);
		} else {
			missing.push(id);
		}
	}

	if (!missing.length) return cached;

	try {
		const fetched = await discord.gateway.requestMembers(guildId, {
			userIds: missing,
			limit: missing.length,
		}) as any as Member[];
		if (!fetched.length && missing.length) {
			throw new ResolutionError(
				`no members found for: ${missing.join(", ")}`,
				missing.join(","),
			);
		}
		return [...cached, ...fetched];
	} catch (e) {
		if (e instanceof ResolutionError) throw e;
		throw new ResolutionError(
			`failed to fetch members: ${(e as Error).message}`,
			missing.join(","),
		);
	}
}

export async function resolveRole(
	id: bigint,
	guildId = getConfig().discord.guildId,
): Promise<Role | undefined> {
	const role = await discord.cache.roles.get(id);
	if (role) return role;

	return discord.helpers.getRole(guildId, id);
}

export async function resolveChannel(
	id: bigint,
): Promise<Channel | undefined> {
	const channel = await discord.cache.channels.get(id);
	if (channel) return channel;

	return discord.helpers.getChannel(id);
}

export async function resolveGuild(
	id: bigint = getConfig().discord.guildId,
): Promise<Guild> {
	const guild = await discord.cache.guilds.get(id);
	if (guild) return guild as any;

	return discord.helpers.getGuild(id);
}
