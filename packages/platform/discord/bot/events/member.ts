/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type discord from "@kuristina/discord-bot";
import { repositories } from "@kuristina/database";

export const guildMemberAdd: typeof discord.events.guildMemberAdd = async (member) => {
	if (!member.guildId) return logger.boo("memberAdd: guild id not available");

	const result = await repositories.members.setPresent(member.id, member.guildId);
	if (!result.ok) logger.boo("memberAdd: failed to update guild presence: " + result.error);
};

export const guildMemberRemove: typeof discord.events.guildMemberRemove = async (user, guildId) => {
	const result = await repositories.members.setAbsent(user.id, guildId);
	if (!result.ok) logger.boo(":memberRemove: failed to update guild presence: " + result.error);
};
