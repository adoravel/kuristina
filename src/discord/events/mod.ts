/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { messageCreate, messageDelete, messageUpdate } from "~/discord/events/messageHandling.ts";
import interactionCreate from "~/discord/events/interactionCreate.ts";
import { Events } from "~/discord/types";

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

export default {
	messageCreate: guarded("messageCreate", messageCreate),
	messageUpdate: guarded("messageUpdate", messageUpdate),
	messageDelete: guarded("messageDelete", messageDelete),
	interactionCreate: guarded("interactionCreate", interactionCreate),
};
