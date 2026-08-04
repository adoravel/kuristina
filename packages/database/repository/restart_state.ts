/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { repositories } from "./mod.ts";

const STATE_KEY = "pending_restart";

export interface PendingRestart {
	channelId: bigint;
	messageId: bigint;
}

export async function markPendingRestart(channelId: bigint, messageId: bigint): Promise<void> {
	await repositories.state.set(
		STATE_KEY,
		JSON.stringify({ channelId: channelId.toString(), messageId: messageId.toString() }),
	);
}

export async function takePendingRestart(): Promise<PendingRestart | null> {
	const stored = await repositories.state.get(STATE_KEY);
	if (!stored.ok || !stored.value) return null;

	try {
		const { channelId, messageId } = JSON.parse(stored.value) as {
			channelId: string;
			messageId: string;
		};
		return { channelId: BigInt(channelId), messageId: BigInt(messageId) };
	} catch {
		return null;
	} finally {
		await repositories.state.delete(STATE_KEY);
	}
}
