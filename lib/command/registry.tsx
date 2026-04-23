/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { command, CommandArgs, CommandParser, CommandRemaining } from "~/lib/command/parser.ts";
import { StringStream } from "~/lib/combinators/stream.ts";
import { infer, prettify } from "~/lib/combinators/mod.ts";
import { TimedMap } from "~/lib/util/map.ts";
import { ErrorMessage, SuccessMessage } from "~/lib/ui";
import { word } from "~/lib/combinators/primitives.ts";

import {
	CreateMessageOptions,
	DiscordPlatform,
	Guild,
	Member,
	Message,
	PermissionStrings,
	User,
} from "~/discord/types";
import discord from "~/discord/bot";
import { ResolutionError, resolveGuild, resolveMember } from "~/discord/resolve";
import { getConfig } from "~/config/mod.ts";

type BaseArgs = Record<string, any>;

export interface CommandMetadata<Args extends BaseArgs = BaseArgs, R = string> {
	readonly aliases: string[];
	readonly parse: CommandParser<Args, R>;
	readonly description?: string;
	readonly category?: string;
	readonly cooldownMs?: number;
	readonly middleware?: Middleware[];

	exec(ctx: CommandExecutionContext<Args, R>): Promise<void>;
}

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

export class CommandExecutionContext<
	Args extends BaseArgs = BaseArgs,
	R = string,
> {
	private _responseId?: bigint;

	constructor(
		public readonly command: CommandMetadata<Args>,
		public readonly args: CommandArgs<Args>,
		public readonly remaining: CommandRemaining<R>,
		public readonly message: Message,
		public readonly middlewareData: Map<string, unknown>,
	) {}

	get platform(): DiscordPlatform {
		return discord;
	}

	async getGuild(): Promise<Guild | undefined> {
		if (!this.message.guildId) return undefined;
		return await resolveGuild(this.message.guildId);
	}

	async getMember(): Promise<Member | undefined> {
		if (!this.message.guildId) return undefined;
		if (this.message.member) return this.message.member;
		return await resolveMember(this.message.author.id, this.message.guildId);
	}

	get user(): User {
		return this.message.author;
	}

	get responseId(): bigint | undefined {
		return this._responseId;
	}

	async reply(opts: CreateMessageOptions): Promise<void> {
		await this.sendOrEdit(opts);
	}

	async error(content: string): Promise<void> {
		await this.reply({
			...<ErrorMessage>{content}</ErrorMessage>,
		});
	}

	async success(content: string): Promise<void> {
		await this.reply({
			allowedMentions: { repliedUser: true },
			...<SuccessMessage>{content}</SuccessMessage>,
		});
	}

	private async sendOrEdit(opts: CreateMessageOptions): Promise<void> {
		this.ensureMessageReference(opts);

		if (!this._responseId) {
			const response = await this.platform.helpers.sendMessage(
				this.message.channelId,
				opts,
			);
			this._responseId = response.id;
			return void contextCache.set(response.id, this);
		}

		try {
			await this.platform.helpers.editMessage(
				this.message.channelId,
				this._responseId,
				opts,
			);
		} catch (e) {
			if ((e as any)?.code === 10008 /* unknown message */) {
				return this._responseId = undefined, this.sendOrEdit(opts);
			}
			throw e;
		}
	}

	private ensureMessageReference(opts: CreateMessageOptions): void {
		if (!opts.messageReference && this.message) {
			opts.messageReference = {
				messageId: this.message.id,
				channelId: this.message.channelId,
				guildId: this.message.guildId,
				failIfNotExists: false,
			};
		}
	}
}

class CommandRegistry {
	private readonly _commands = new Map<string, CommandMetadata>();
	private readonly globalMiddleware: Middleware[] = [];
	private readonly cooldowns = new Map<string, number>();

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
			!this.checkCooldown(message.author.id, cmd.aliases[0], cmd.cooldownMs)
		) {
			return await this.sendCooldownMessage(message);
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
			return await this.sendParseError(message, result.data);
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
				this.setCooldown(message.author.id, cmd.aliases[0], cmd.cooldownMs);
			}
		} catch (error) {
			if (error instanceof ResolutionError) {
				await this.sendResolutionError(message, error);
			} else {
				console.error(`Command execution error (${cmd.aliases[0]}):`, error);
				await this.sendExecutionError(message, error);
			}
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

	private checkCooldown(
		userId: bigint,
		commandName: string,
		cooldownMs: number,
	): boolean {
		const key = `${userId}${commandName}`;
		const lastUsed = this.cooldowns.get(key);

		if (!lastUsed) return true;

		const elapsed = Date.now() - lastUsed;
		return elapsed >= cooldownMs;
	}

	private setCooldown(
		userId: bigint,
		commandName: string,
		cooldownMs: number,
	): void {
		const key = `${userId}${commandName}`;
		this.cooldowns.set(key, Date.now());
		setTimeout(() => this.cooldowns.delete(key), cooldownMs);
	}

	private async sendCooldownMessage(message: Message): Promise<void> {
		try {
			await this.platform.helpers.sendMessage(message.channelId, {
				messageReference: {
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId,
				},
				...(
					<ErrorMessage title="Cooldown" emoji={getConfig().emojis.loading}>
						Please wait before using this command again.
					</ErrorMessage>
				),
			});
		} catch (error) {
			console.error("failed to send cooldown message:", error);
		}
	}

	private async sendParseError(
		message: Message,
		error: any,
	): Promise<void> {
		try {
			await this.platform.helpers.sendMessage(message.channelId, {
				messageReference: {
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId,
				},
				...(
					<ErrorMessage>
						{`${getConfig().emojis.error} **Command Parse Error**\n\`\`\`\n${
							prettify(error)
						}\n\`\`\``}
					</ErrorMessage>
				),
			});
		} catch (err) {
			console.error("failed to send parse error:", err);
		}
	}

	private async sendResolutionError(
		message: Message,
		error: ResolutionError,
	): Promise<void> {
		try {
			await this.platform.helpers.sendMessage(message.channelId, {
				messageReference: {
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId!,
				},
				...(
					<ErrorMessage title="Not Found">
						{error.message}
					</ErrorMessage>
				),
			});
		} catch (err) {
			console.error("failed to send resolution error:", err);
		}
	}

	private async sendExecutionError(
		message: Message,
		error: unknown,
	): Promise<void> {
		try {
			const errorMsg = error instanceof Error ? error.message : String(error);
			await this.platform.helpers.sendMessage(message.channelId, {
				messageReference: {
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId,
				},
				...(
					<ErrorMessage>
						{`${getConfig().emojis.error} **Command Execution Error**\n\`\`\`\n${errorMsg}\n\`\`\``}
					</ErrorMessage>
				),
			});
		} catch (err) {
			console.error("failed to send execution error:", err);
		}
	}
}

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
		if (author.id !== getConfig().owner.id) {
			try {
				await ctx.platform.helpers.sendMessage(
					ctx.message.channelId,
					{
						content: `${getConfig().emojis.error} Give up.`,
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
						content: `${getConfig().emojis.error} This command only works in servers.`,
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
							`${getConfig().emojis.error} You're not allowed to use this command.\nRequired: ${
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

export const contextCache = new TimedMap<bigint, CommandExecutionContext<any, any>>(
	5 * 60 * 1000,
);

export const commandRegistry = new CommandRegistry();

export function defineCommand<Args extends BaseArgs>(
	aliases: string[] | string,
	args: Args,
	exec: (
		ctx: CommandExecutionContext<Omit<Args, "$">, Args["$"]>,
	) => Promise<void>,
	options?: Partial<CommandMetadata<Omit<Args, "$">, Args["$"]>>,
): CommandMetadata<Omit<Args, "$">, Args["$"]> {
	aliases = typeof aliases === "string" ? [aliases] : aliases;

	const { $: remaining, ...namedArgs } = args;

	const parser = command(
		namedArgs,
		remaining,
	) as CommandParser<Omit<Args, "$">, Args["$"]>;

	return {
		aliases,
		parse: parser,
		exec,
		...options,
	};
}

export function middleware(
	name: string,
	execute: (ctx: MiddlewareContext) => Promise<MiddlewareResult>,
	priority?: number,
): Middleware {
	return { name, execute, priority };
}
