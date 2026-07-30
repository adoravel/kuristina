/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	BatchExecuteError,
	type BatchExecuteRequestOptions,
	type BatchExecuteRpc,
} from "./types.ts";

function randomRequestId(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0] % 9_000 + 1_000;
}

function assertRequestId(requestId: number): void {
	if (!Number.isInteger(requestId) || requestId < 1_000 || requestId > 9_999) {
		throw new BatchExecuteError("requestId must be a four-digit positive integer");
	}
}

function assertRpc(rpc: BatchExecuteRpc, index: number): void {
	if (!rpc || typeof rpc.id !== "string" || !rpc.id) {
		throw new BatchExecuteError(`rpc ${index} must have a non-empty string id`);
	}
}

function requestPath(app: string, user?: string): string {
	const appPath = app.replace(/^\/+|\/+$/g, "");
	if (!appPath) throw new BatchExecuteError("app must not be empty");
	return user
		? `/u/${encodeURIComponent(user)}/_/${appPath}/data/batchexecute`
		: `/_/${appPath}/data/batchexecute`;
}

export class PreparedBatchExecute {
	readonly #options: BatchExecuteRequestOptions;
	readonly #requestId: number;

	constructor(options: BatchExecuteRequestOptions) {
		if (!options.host) throw new BatchExecuteError("host must not be empty");
		if (!options.rpcs.length) throw new BatchExecuteError("at least one rpc is required");
		options.rpcs.forEach(assertRpc);

		this.#options = options;
		this.#requestId = options.requestId ?? randomRequestId();
		assertRequestId(this.#requestId);
	}

	get url(): URL {
		const url = new URL(
			`https://${this.#options.host}${requestPath(this.#options.app, this.#options.user)}`,
		);
		const rpcIds = [...new Set(this.#options.rpcs.map((rpc) => rpc.id))];
		url.searchParams.set("rpcids", rpcIds.join(","));
		url.searchParams.set("_reqid", String(this.#requestId + (this.#options.index ?? 0) * 100_000));
		if (this.#options.responseMode) url.searchParams.set("rt", this.#options.responseMode);

		for (const [name, value] of Object.entries(this.#options.params ?? {})) {
			if (value !== undefined) url.searchParams.set(name, String(value));
		}

		return url;
	}

	get headers(): Headers {
		return new Headers({ "content-type": "application/x-www-form-urlencoded;charset=utf-8" });
	}

	get body(): URLSearchParams {
		const multiple = this.#options.rpcs.length > 1;
		const envelopes = this.#options.rpcs.map((rpc, index) => [
			rpc.id,
			JSON.stringify(rpc.args),
			null,
			multiple ? String(index + 1) : "generic",
		]);
		const body = new URLSearchParams({ "f.req": JSON.stringify([envelopes]) });
		for (const [name, value] of Object.entries(this.#options.form ?? {})) {
			if (value !== undefined) body.set(name, String(value));
		}
		return body;
	}

	toRequestInit(signal?: AbortSignal): RequestInit {
		return { method: "POST", headers: this.headers, body: this.body, signal };
	}
}
