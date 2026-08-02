/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord from "@kuristina/discord-bot";
import { repositories } from "@kuristina/database";
import { reconcileGuild } from "../lifecycle/presence.ts";

export const guildCreate: typeof discord.events.guildCreate = async (guild) => {
	await reconcileGuild(discord, guild.id);
};

export const guildDelete: typeof discord.events.guildDelete = async (guild) => {
	const result = await repositories.members.reconcileGuild(guild.id, new Set());
	if (!result.ok) logger.boo("[guildDelete] failed to purge guild presence: " + result.error);
};
