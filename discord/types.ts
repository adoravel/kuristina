import discord from "discord/bot";

export type DiscordPlatform = typeof discord;

export type User = typeof discord.transformers.$inferredTypes.user;

export type Guild = typeof discord.transformers.$inferredTypes.guild;

export type Member = typeof discord.transformers.$inferredTypes.member;

export type Message = typeof discord.transformers.$inferredTypes.message;

export type Channel = typeof discord.transformers.$inferredTypes.channel;

export type Role = typeof discord.transformers.$inferredTypes.role;

export type Interaction = typeof discord.transformers.$inferredTypes.interaction;

export type MessageInteraction = typeof discord.transformers.$inferredTypes.messageInteraction;

export type {
	CreateMessageOptions,
	EditMessage,
	PermissionStrings,
	SelectOption,
} from "@discordeno/types";

export { InteractionTypes, MessageComponentTypes } from "@discordeno/types";
