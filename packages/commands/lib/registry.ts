/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { infer, type StringStream, word } from "@kuristina/commands";

import type { Message } from "@kuristina/discord-bot";
import discord from "@kuristina/discord-bot";

import { CommandExecutionContext } from "./context.tsx";
import type { CommandMetadata } from "./definition.ts";
import type { Middleware, MiddlewareContext, MiddlewareResult } from "./middleware.ts";

import { CooldownTracker } from "./cooldown.ts";
import { sendCooldownMessage, sendExecutionError, sendParseError } from "./responses.tsx";

class CommandRegistry {
	private readonly _commands = new Map<string, CommandMetadata>();
	private readonly globalMiddleware: Middleware[] = [];
	private readonly cooldowns = new CooldownTracker();

	get platform(): typeof discord {
		return discord;
	}

	get commands(): CommandMetadata[] {
		return [...new Set(this._commands.values())];
	}

	get commandNames(): string[] {
		return [...new Set(this._commands.keys())];
	}

	register(cmd: CommandMetadata<any, any>): void {
		for (const alias of cmd.aliases) {
			if (this._commands.has(alias)) {
				throw new Error(`command alias "${alias}" is already registered`);
			}
			this._commands.set(alias, cmd);
		}
		console.info(`registered command: ${cmd.aliases.join(", ")}`);
	}

	use(middleware: Middleware): void {
		this.globalMiddleware.push(middleware);
		this.globalMiddleware.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
		console.info(`registered middleware: ${middleware.name}`);
	}

	async execute(message: Message, stream: StringStream): Promise<void> {
		const middlewareCtx: MiddlewareContext = {
			message,
			stream,
			platform: this.platform,
			data: new Map(),
		};

		const mid = await this.runMiddlewares(this.globalMiddleware, middlewareCtx);
		if (mid.type !== "continue") {
			if (mid.type === "error") {
				console.error("global middleware error:", mid.error);
			}
			return;
		}

		const name = word(stream);
		if (!infer("success")(name)) return;

		const cmd = this._commands.get(name.data.toLowerCase());
		if (!cmd) return;

		middlewareCtx.metadata = cmd;

		if (
			cmd.cooldownMs &&
			!this.cooldowns.check(message.author.id, cmd.aliases[0], cmd.cooldownMs)
		) {
			return await sendCooldownMessage(message);
		}

		if (cmd.middleware?.length) {
			const cmdMid = await this.runMiddlewares(cmd.middleware, middlewareCtx);
			if (cmdMid.type !== "continue") {
				if (cmdMid.type === "error") {
					console.error("middleware error:", cmdMid.error);
				}
				return;
			}
		}

		const result = cmd.parse(stream);
		if (!infer("success")(result)) {
			return await sendParseError(message, result.data);
		}

		try {
			const ctx = new CommandExecutionContext(
				cmd,
				result.data.args,
				result.data.remaining,
				message,
				middlewareCtx.data,
			);

			await cmd.exec(ctx);
			if (cmd.cooldownMs) {
				this.cooldowns.set(message.author.id, cmd.aliases[0], cmd.cooldownMs);
			}
		} catch (error) {
			console.error(`Command execution error (${cmd.aliases[0]}):`, error);
			await sendExecutionError(message, error);
		}
	}

	private async runMiddlewares(
		middlewares: Middleware[],
		ctx: MiddlewareContext,
	): Promise<MiddlewareResult> {
		for (const middleware of middlewares) {
			try {
				const result = await middleware.execute(ctx);
				if (result.type !== "continue") {
					return result;
				}
			} catch (error) {
				console.error(`Middleware error (${middleware.name}):`, error);
				return { type: "error", error: error as Error };
			}
		}
		return { type: "continue" };
	}
}

export const commandRegistry = new CommandRegistry();
