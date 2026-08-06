/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import type { Invocation } from "./invocation.tsx";
import { CommandCooldownOrchestrator } from "./cooldown.ts";

export type MiddlewareResult = { type: "continue" } | { type: "stop"; reason?: CommandGateReason };

export interface Middleware {
	readonly name: string;
	readonly ownerOnly?: true;
	readonly priority?: number;
	execute(ctx: Invocation): Promise<MiddlewareResult>;
}

export const enum CommandGateReason {
	NotOwner,
	NotAllowed,
	CooldownActive,
	MissingPermissions,
	OwnerOnly,
	GuildOnly,
}

export const ownerOnly: Middleware = {
	name: "owner-only",
	ownerOnly: true,
	async execute(ctx) {
		if (ctx.user.id !== config.owner.id) {
			if (ctx.raw.kind === "text" && ctx.raw.isReinvocation) return { type: "continue" };
			await ctx.reply({ content: "Give up." });
			return { type: "stop", reason: CommandGateReason.NotOwner };
		}
		return { type: "continue" };
	},
};

export const allowedUsers = (userIds: bigint[]): Middleware => ({
	name: "allowed-users",
	async execute(ctx) {
		if (!userIds.includes(ctx.user.id)) {
			await ctx.reply({ content: "You're not allowed to use this command." });
			return { type: "stop", reason: CommandGateReason.NotAllowed };
		}
		return { type: "continue" };
	},
});

export const permissions = (required: readonly string[]): Middleware => ({
	name: "permissions",
	async execute(ctx) {
		const allow = required.every((p) => ctx.member?.permissions?.has(p as never) ?? false);
		if (!allow) {
			await ctx.reply({
				content: `You're not allowed to use this command.\nRequired: ${required.join(", ")}`,
			});
			return { type: "stop", reason: CommandGateReason.MissingPermissions };
		}
		return { type: "continue" };
	},
});

export const cooldownOrchestrator = new CommandCooldownOrchestrator();
export const PENDING_COOLDOWN = Symbol("pendingCooldown");

export function cooldown(commandKey: string, ms: number): Middleware {
	return {
		name: "cooldown",
		async execute(ctx) {
			if (!cooldownOrchestrator.check(ctx.user.id, commandKey)) {
				await ctx.reply({ content: "Please wait before using this command again." });
				return { type: "stop", reason: CommandGateReason.CooldownActive };
			}
			(ctx as any)[PENDING_COOLDOWN] = { userId: ctx.user.id, commandKey, ms };
			return { type: "continue" };
		},
	};
}
