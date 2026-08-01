/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { repositories } from "@kuristina/database";
import { SuccessMessage } from "@kuristina/discord-ui";
import type discord from "../bot.ts";

const STATE_KEY = "pending_restart";

export async function requestRestart(channelId: bigint, messageId: bigint): Promise<never> {
	await repositories.state.set(
		STATE_KEY,
		JSON.stringify({ channelId: channelId.toString(), messageId: messageId.toString() }),
	);
	console.log("  · restart: state saved, exiting for supervisor restart");
	Deno.exit(0);
}

export async function confirmRestartIfPending(bot: typeof discord): Promise<void> {
	const stored = await repositories.state.get(STATE_KEY);
	if (!stored.ok || !stored.value) return;

	try {
		const { channelId, messageId } = JSON.parse(stored.value) as {
			channelId: string;
			messageId: string;
		};
		await bot.helpers.editMessage(BigInt(channelId), BigInt(messageId), {
			...SuccessMessage({ children: "haii we r so back,, <a:Mika67:1528181039070187612>" }),
		});
	} catch (e) {
		console.error("  · restart: failed to confirm restart:", e);
	} finally {
		await repositories.state.delete(STATE_KEY);
	}
}
