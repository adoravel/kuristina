/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { DiscordPlatform, Message, PermissionStrings } from "@kuristina/discord-bot";
import type { StringStream } from "@kuristina/commands";

import type { CommandMetadata } from "./definition.ts";
import { config } from "@kuristina/config";

export interface Middleware {
	readonly name: string;
	readonly priority?: number; // the lower it is, the first it runs!!11!!!111!!

	execute(ctx: MiddlewareContext): Promise<MiddlewareResult>;
}

export interface MiddlewareContext {
	readonly message: Message;
	readonly platform: DiscordPlatform;
	readonly stream: StringStream;
	metadata?: CommandMetadata;
	data: Map<string, unknown>;
}

export type MiddlewareResult =
	| { type: "continue" }
	| { type: "stop"; reason?: string }
	| { type: "error"; error: Error };

export const logging: Middleware = {
	name: "logging",
	priority: 0,

	execute(ctx): Promise<MiddlewareResult> {
		console.log(`[${ctx.message.author.username}:${ctx.message.author.id}] ${ctx.message.content}`);
		return Promise.resolve({ type: "continue" });
	},
};

export const ownerOnly: Middleware = {
	name: "owner-only",
	priority: 0,

	async execute(ctx): Promise<MiddlewareResult> {
		const { author } = ctx.message;
		if (!author) {
			return { type: "stop", reason: "No author data" };
		}
		if (author.id !== config.owner.id) {
			try {
				await ctx.platform.helpers.sendMessage(
					ctx.message.channelId,
					{
						content: `${config.design.emojis.error} Give up.`,
						messageReference: {
							messageId: ctx.message.id,
							channelId: ctx.message.channelId,
							guildId: ctx.message.guildId,
							failIfNotExists: false,
						},
					},
				);
			} catch (error) {
				console.error("failed to send owner-only error:", error);
			}
			return { type: "stop", reason: "Not owner" };
		}
		return { type: "continue" };
	},
};

export const guildOnly: Middleware = {
	name: "guild-only",
	priority: 10,
	async execute(ctx) {
		if (!ctx.message.guildId) {
			try {
				await ctx.platform.helpers.sendMessage(
					ctx.message.channelId,
					{
						content: `${config.design.emojis.error} This command only works in servers.`,
					},
				);
			} catch (error) {
				console.error("failed to send guild-only message:", error);
			}
			return { type: "stop", reason: "DM message" };
		}
		return { type: "continue" };
	},
};

export const permissions = (
	permissions: (PermissionStrings)[],
): Middleware => ({
	name: "permissions",
	priority: 20,

	async execute(ctx) {
		const member = ctx.message.member;
		if (!member) {
			return { type: "stop", reason: "no member data" };
		}

		const allow = permissions.every((p) => member.permissions?.has(p) ?? false);

		if (!allow) {
			try {
				await ctx.platform.helpers.sendMessage(
					ctx.message.channelId,
					{
						content:
							`${config.design.emojis.error} You're not allowed to use this command.\nRequired: ${
								permissions.join(", ")
							}`,
						messageReference: {
							messageId: ctx.message.id,
							channelId: ctx.message.channelId,
							guildId: ctx.message.guildId,
							failIfNotExists: false,
						},
					},
				);
			} catch (error) {
				console.error("failed to send permission error:", error);
			}
			return { type: "stop", reason: "Lacking permissions" };
		}
		return { type: "continue" };
	},
});

export function middleware(
	name: string,
	execute: (ctx: MiddlewareContext) => Promise<MiddlewareResult>,
	priority?: number,
): Middleware {
	return { name, execute, priority };
}
