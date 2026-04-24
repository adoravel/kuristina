/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import discord from "~/discord/bot";

export type DiscordPlatform = typeof discord;

export type User = typeof discord.transformers.$inferredTypes.user;

export type Guild = typeof discord.transformers.$inferredTypes.guild;

export type Member = typeof discord.transformers.$inferredTypes.member;

export type Message = typeof discord.transformers.$inferredTypes.message;

export type Channel = typeof discord.transformers.$inferredTypes.channel;

export type Role = typeof discord.transformers.$inferredTypes.role;

export type Interaction = typeof discord.transformers.$inferredTypes.interaction;

export type Reaction = Parameters<NonNullable<typeof discord.events.reactionAdd>>[0];

export type MessageInteraction = typeof discord.transformers.$inferredTypes.messageInteraction;

export type Events = typeof discord.events;

export type {
	CreateMessageOptions,
	EditMessage,
	PermissionStrings,
	SelectOption,
} from "@discordeno/types";

export { InteractionTypes, MessageComponentTypes } from "@discordeno/types";
