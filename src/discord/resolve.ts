/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord from "~/discord/bot";
import { Channel, Guild, Member, Role, User } from "~/discord/types";
import { getConfig } from "~/config/mod.ts";
import { withRetry } from "~/lib/util/retry.ts";
import { safePromise, tap } from "~/lib/result.ts";

export type HydratedMember = Member & { user: User };

async function hydrate(member: Member): Promise<HydratedMember> {
	if (!member.user) {
		const user = await safePromise(discord.helpers.getUser(member.id));
		tap((user) => (member as any).user = user)(user);
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
	guildId = getConfig().discord.guildId,
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
	guildId = getConfig().discord.guildId,
): Promise<Role | undefined> {
	const cached = await discord.cache.roles.get(id);
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
	id: bigint = getConfig().discord.guildId,
): Promise<Guild> {
	const cached = await discord.cache.guilds.get(id);
	if (cached) return cached as unknown as Guild;

	const fetched = await safePromise(withRetry(() => discord.helpers.getGuild(id)));
	if (!fetched.ok) throw fetched.error;
	return fetched.value as unknown as Guild;
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
		console.error("  · resolve: failed to fetch members:", fetched.error.message);
		return cached;
	}

	return [...cached, ...await Promise.all(fetched.value.map(hydrate))];
}
