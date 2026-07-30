/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { Message } from "@kuristina/discord-bot";
import discord from "@kuristina/discord-bot";
import { ErrorMessage } from "@kuristina/discord-ui";
import { config } from "@kuristina/config";
import { type ParsingError, prettify } from "../combinators/mod.ts";

function reference(message: Message) {
	return { messageId: message.id, channelId: message.channelId, guildId: message.guildId };
}

async function sendError(message: Message, node: ReturnType<typeof ErrorMessage>): Promise<void> {
	try {
		await discord.helpers.sendMessage(message.channelId, {
			messageReference: reference(message),
			...node,
		});
	} catch (error) {
		console.error("failed to send command error:", error);
	}
}

export const sendCooldownMessage = (message: Message) =>
	sendError(
		message,
		<ErrorMessage title="Cooldown" emoji={config.design.emojis.loading}>
			Please wait before using this command again.
		</ErrorMessage>,
	);

export const sendBlockedMessage = (message: Message, reason: string) =>
	sendError(message, <ErrorMessage title="Blocked">{reason}</ErrorMessage>);

export const sendParseError = (message: Message, error: ParsingError) =>
	sendError(
		message,
		<ErrorMessage>
			{`**Command Parse Error**\n\`\`\`\n${prettify(error)}\n\`\`\``}
		</ErrorMessage>,
	);

export const sendExecutionError = (message: Message, error: unknown) =>
	sendError(
		message,
		<ErrorMessage>
			{`**Command Execution Error**\n\`\`\`\n${
				error instanceof Error ? error.message : String(error)
			}\n\`\`\``}
		</ErrorMessage>,
	);
