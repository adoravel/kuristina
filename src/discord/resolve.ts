/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord from "~/discord/bot";
import { Channel, Guild, Member, Role, User } from "~/discord/types";
import { getConfig } from "~/config/mod.ts";
import { withRetry } from "~/lib/util/retry.ts";

export type HydratedMember = Member & { user: User };

async function hydrate(member: Member): Promise<HydratedMember> {
	(member as any).user ??= await resolveUser(member.id);
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
	guildId = getConfig().discord.guildId,
): Promise<HydratedMember | undefined> {
	const cached = await discord.cache.members.get(id, guildId);
	if (cached) return hydrate(cached);

	const fetched = await withRetry(() => discord.helpers.getMember(guildId, id));
	return fetched ? hydrate(fetched) : undefined;
}

export async function resolveMembers(
	ids: bigint[],
	guildId = getConfig().discord.guildId,
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

	const fetched = await withRetry(
		async () => {
			const members = await discord.gateway.requestMembers(guildId, {
				userIds: missing,
				limit: missing.length,
			});

			if (!members.length) throw new Error(`no members found: ${missing.join(", ")}`);
			return members;
		},
		{ retryIf: (e) => !(e instanceof Error && e.message.startsWith("no members found")) },
	) as any as Member[];

	return [...cached, ...await Promise.all(fetched.map(hydrate))];
}

export async function resolveRole(
	id: bigint,
	guildId = getConfig().discord.guildId,
): Promise<Role | undefined> {
	const role = await discord.cache.roles.get(id);
	if (role) return role;

	return withRetry(() => discord.helpers.getRole(guildId, id));
}

export async function resolveChannel(
	id: bigint,
): Promise<Channel | undefined> {
	const channel = await discord.cache.channels.get(id);
	if (channel) return channel;

	return withRetry(() => discord.helpers.getChannel(id));
}

export async function resolveGuild(
	id: bigint = getConfig().discord.guildId,
): Promise<Guild> {
	const guild = await discord.cache.guilds.get(id);
	if (guild) return guild as any;

	return withRetry(() => discord.helpers.getGuild(id)) as Promise<Guild>;
}
