/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

export type BatchExecuteResponseMode = "c" | "b";

export interface BatchExecuteRpc {
	readonly id: string;
	readonly args: unknown;
}

export interface BatchExecuteRequestOptions {
	readonly host: string;
	readonly app: string;
	readonly rpcs: readonly BatchExecuteRpc[];
	readonly user?: string;
	readonly requestId?: number;
	readonly index?: number;
	readonly responseMode?: BatchExecuteResponseMode;
	readonly params?: Readonly<Record<string, string | number | boolean | undefined>>;
	readonly form?: Readonly<Record<string, string | number | boolean | undefined>>;
}

export interface BatchExecuteResponse {
	readonly index: number;
	readonly rpcId: string;
	readonly data: unknown;
}

export class BatchExecuteError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BatchExecuteError";
	}
}

export interface BatchExecuteSession {
	readonly fSid: string;
	readonly bl: string;
	readonly at: string;
}

export interface BatchExecuteClientOptions {
	readonly origin: string | URL;
	readonly app: string;
	readonly locale?: string;
	readonly sessionTtlMs?: number;
	readonly fetch?: typeof fetch;
}

export interface BatchExecuteCallOptions {
	readonly signal?: AbortSignal;
	readonly requestId?: number;
	readonly index?: number;
	readonly user?: string;
	readonly params?: Readonly<Record<string, string | number | boolean | undefined>>;
}
