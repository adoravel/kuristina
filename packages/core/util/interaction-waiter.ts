/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

interface WaiterEntry<T> {
	resolve: (interaction: T) => void;
	reject: (error: Error) => void;

	filter?: (interaction: T) => boolean;

	timeoutId: ReturnType<typeof setTimeout>;
}

export const waiters = new Map<string, WaiterEntry<any>>();
let nextId = 0;

export function waitForInteraction<T>(
	id: string,
	timeoutMs: number,
	opts?: { filter?: (interaction: T) => boolean },
): { customId: string; promise: Promise<T> } {
	nextId = (nextId + 1) % (Number.MAX_SAFE_INTEGER + 1);

	const token = `${Date.now()}:${nextId}`;
	const customId = `${id}:${token}`;

	const promise = new Promise<T>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			if (waiters.delete(customId)) {
				reject(new Error(`Interaction waiter timed out after ${timeoutMs}ms`));
			}
		}, timeoutMs);

		waiters.set(customId, { resolve, reject, timeoutId, filter: opts?.filter });
	});

	return { customId, promise };
}

export function cancelWaiter(customId: string): void {
	const entry = waiters.get(customId);
	if (entry) {
		clearTimeout(entry.timeoutId);
		waiters.delete(customId);
	}
}
