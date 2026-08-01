/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { messageCreate, messageDelete, messageUpdate } from "./message.ts";
import interactionCreate from "./interactionCreate.ts";

import type { Events } from "@kuristina/discord-bot";
import { guildMemberAdd, guildMemberRemove } from "./member.ts";
import { guildCreate, guildDelete } from "./guild.ts";

function guarded<K extends keyof Events>(
	name: K,
	handler: Events[K],
) {
	return async (...args: Parameters<NonNullable<typeof handler>>) => {
		try {
			return await (handler as any)?.(...args);
		} catch (e) {
			console.error(`[${String(name)}] unhandled error:`, e);
		}
	};
}

export const events = {
	messageCreate: guarded("messageCreate", messageCreate),
	messageUpdate: guarded("messageUpdate", messageUpdate),
	messageDelete: guarded("messageDelete", messageDelete),
	interactionCreate: guarded("interactionCreate", interactionCreate),
	guildMemberAdd: guarded("guildMemberAdd", guildMemberAdd),
	guildMemberRemove: guarded("guildMemberRemove", guildMemberRemove),
	guildCreate: guarded("guildCreate", guildCreate),
	guildDelete: guarded("guildDelete", guildDelete),
};

export { setupInteractionHandler } from "./interactionCreate.ts";
