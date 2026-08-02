/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import discord, { resolveChannel, resolveGuild, resolveMember } from "@kuristina/discord-bot";
import type {
	Channel,
	CreateMessageOptions,
	DiscordPlatform,
	Guild,
	Member,
	Message,
	User,
} from "@kuristina/discord-bot";

import type { CommandArgs, CommandRemaining } from "./parser.ts";
import type { CommandMetadata } from "./definition.ts";
import { ErrorMessage, SuccessMessage } from "@kuristina/discord-ui";
import { repositories } from "@kuristina/database";
import { type AppError, describe } from "@kuristina/errors";
import type { AsyncResult, Result } from "@kuristina/core";

type BaseArgs = Record<string, any>;

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

	static async create<A extends BaseArgs, Rem>(
		command: CommandMetadata<A>,
		args: CommandArgs<A>,
		remaining: CommandRemaining<Rem>,
		message: Message,
		middlewareData: Map<string, unknown>,
	): Promise<CommandExecutionContext<A, Rem>> {
		const ctx = new CommandExecutionContext<A, Rem>(
			command,
			args,
			remaining,
			message,
			middlewareData,
		);

		const prior = await repositories.messageCompanions.getForSource(message.id, "command");
		if (prior.ok && prior.value.length) {
			ctx._responseId = prior.value[0].responseMessageId;
		}

		return ctx;
	}

	async resolve<T, E extends AppError>(
		result: AsyncResult<T, E> | Result<T, E>,
	): Promise<T | undefined> {
		const resolved = await result;
		if (!resolved.ok) {
			await this.error(describe(resolved.error));
			return undefined;
		}
		return resolved.value;
	}

	get platform(): DiscordPlatform {
		return discord;
	}

	async getGuild(): Promise<Guild | undefined> {
		if (!this.message.guildId) return undefined;
		return await resolveGuild(this.message.guildId);
	}

	async getChannel(): Promise<Channel> {
		return await resolveChannel(this.message.channelId) as Channel;
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

	async reply(opts: CreateMessageOptions): Promise<Message> {
		return await this.sendOrEdit(opts);
	}

	async error(content: string): Promise<Message> {
		return await this.reply({
			...<ErrorMessage>{content}</ErrorMessage>,
		});
	}

	async success(content: string): Promise<Message> {
		return await this.reply({
			allowedMentions: { repliedUser: true },
			...<SuccessMessage>{content}</SuccessMessage>,
		});
	}

	private async sendOrEdit(opts: CreateMessageOptions): Promise<Message> {
		this.ensureMessageReference(opts);

		if (!this._responseId) {
			const response = await this.platform.helpers.sendMessage(
				this.message.channelId,
				opts,
			);
			this._responseId = response.id;

			await repositories.messageCompanions.add(
				this.message.id,
				response.id,
				this.message.channelId,
				"command",
			);
			return response;
		}

		try {
			const edit = await this.platform.helpers.editMessage(
				this.message.channelId,
				this._responseId,
				opts,
			);
			await repositories.messageCompanions.add(
				this.message.id,
				edit.id,
				this.message.channelId,
				"command",
			);
			return edit;
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
				failIfNotExists: false,
			};
			if (this.message.guildId) {
				opts.messageReference.guildId = this.message.guildId;
			}
		}
	}
}
