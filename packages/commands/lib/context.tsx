/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { TimedMap } from "@kuristina/core";
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
import { getConfig } from "@kuristina/config";

type BaseArgs = Record<string, any>;

export const contextCache = new TimedMap<bigint, CommandExecutionContext<any, any>>(
	5 * 60 * 1000,
);

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

			contextCache.set(this.message.id, this);
			return response;
		}

		try {
			return await this.platform.helpers.editMessage(
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
				failIfNotExists: false,
			};
			if (this.message.guildId) {
				opts.messageReference.guildId = this.message.guildId;
			}
		}
	}
}

export async function sendCooldownMessage(message: Message): Promise<void> {
	try {
		await discord.helpers.sendMessage(message.channelId, {
			messageReference: {
				messageId: message.id,
				channelId: message.channelId,
				guildId: message.guildId,
			},
			...(
				<ErrorMessage title="Cooldown" emoji={getConfig().design.emojis.loading}>
					Please wait before using this command again.
				</ErrorMessage>
			),
		});
	} catch (error) {
		console.error("failed to send cooldown message:", error);
	}
}
