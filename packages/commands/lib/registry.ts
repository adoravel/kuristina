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

interface ResolvedCommand {
	cmd: CommandMetadata;
	/** first alias of every command visited on the way down, e.g. ["fm", "login"] */
	path: string[];
	/** middleware from the whole chain, root to leaf, in order */
	middleware: Middleware[];
}

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
		logger.info(`registered command: ${cmd.aliases.join(", ")}`);
	}

	use(middleware: Middleware): void {
		this.globalMiddleware.push(middleware);
		this.globalMiddleware.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
		logger.info(`registered middleware: ${middleware.name}`);
	}

	private resolve(root: CommandMetadata, stream: StringStream): ResolvedCommand {
		let cmd = root;
		const path = [root.aliases[0]];
		const middleware = [...(root.middleware ?? [])];

		while (cmd.subcommands?.size) {
			stream.push();
			stream.skipWhitespace();

			const name = word(stream);
			if (!infer("success")(name)) {
				stream.restore();
				break;
			}

			const sub = cmd.subcommands.get(name.data.toLowerCase());
			if (!sub) {
				stream.restore();
				break;
			}

			stream.pop();
			cmd = sub;
			path.push(sub.aliases[0]);
			if (sub.middleware?.length) middleware.push(...sub.middleware);
		}

		return { cmd, path, middleware };
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
				logger.boo("global middleware error:", mid.error);
			}
			return;
		}

		const name = word(stream);
		if (!infer("success")(name)) return;

		const root = this._commands.get(name.data.toLowerCase());
		if (!root) return;

		const { cmd, path, middleware } = this.resolve(root, stream);
		const cooldownKey = path.join(" ");

		middlewareCtx.metadata = cmd;

		if (
			cmd.cooldownMs &&
			!this.cooldowns.check(message.author.id, cooldownKey, cmd.cooldownMs)
		) {
			return await sendCooldownMessage(message);
		}

		if (middleware.length) {
			const cmdMid = await this.runMiddlewares(middleware, middlewareCtx);
			if (cmdMid.type !== "continue") {
				if (cmdMid.type === "error") {
					logger.boo("middleware error:", cmdMid.error);
				}
				return;
			}
		}

		const result = cmd.parse(stream);
		if (!infer("success")(result)) {
			return await sendParseError(message, result.data);
		}

		try {
			const ctx = await CommandExecutionContext.create<any, any>(
				cmd,
				result.data.args,
				result.data.remaining,
				message,
				middlewareCtx.data,
			);

			await cmd.exec(ctx);
			if (cmd.cooldownMs) {
				this.cooldowns.set(message.author.id, cooldownKey, cmd.cooldownMs);
			}
		} catch (error) {
			logger.boo(`command execution error (${cooldownKey}):`, error);
			await sendExecutionError(message);
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
				logger.boo(`middleware error (${middleware.name}):`, error);
				return { type: "error", error: error as Error };
			}
		}
		return { type: "continue" };
	}
}

export const commandRegistry = new CommandRegistry();
