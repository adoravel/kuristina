/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { decodeBatchExecuteResponse } from "./decoder.ts";
import { PreparedBatchExecute } from "./encoder.ts";
import {
	type BatchExecuteCallOptions,
	type BatchExecuteClientOptions,
	BatchExecuteError,
	type BatchExecuteRpc,
	type BatchExecuteSession,
} from "./types.ts";

const WIZ_FIELDS = {
	fSid: /"FdrFJe":"(.*?)"/,
	bl: /"cfb2h":"(.*?)"/,
	at: /"SNlM0e":"(.*?)"/,
} as const;

function validateOrigin(origin: string | URL): URL {
	const url = new URL(origin);
	if (url.protocol !== "https:") throw new BatchExecuteError("origin must use HTTPS");
	if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
		throw new BatchExecuteError("origin must not contain credentials, a path, query, or fragment");
	}
	return url;
}

function extractWizSession(document: string): BatchExecuteSession {
	const start = document.indexOf("WIZ_global_data = {");
	const end = document.indexOf("</script>", start);
	if (start < 0 || end < 0) throw new BatchExecuteError("WIZ global data was not found");

	const script = document.slice(start, end);
	const values = Object.fromEntries(
		Object.entries(WIZ_FIELDS).map(([key, pattern]) => {
			const value = pattern.exec(script)?.[1];
			if (!value) throw new BatchExecuteError(`WIZ session field ${key} was not found`);
			return [key, value];
		}),
	);

	return values as unknown as BatchExecuteSession;
}

export class BatchExecuteClient {
	readonly #origin: URL;
	readonly #app: string;
	readonly #locale: string;
	readonly #sessionTtlMs: number;
	readonly #fetch: typeof fetch;
	#session?: { value: BatchExecuteSession; expiresAt: number };

	constructor(options: BatchExecuteClientOptions) {
		this.#origin = validateOrigin(options.origin);
		this.#app = options.app;
		this.#locale = options.locale ?? "en";
		this.#sessionTtlMs = options.sessionTtlMs ?? 3_600_000;
		this.#fetch = options.fetch ?? fetch;
		if (!Number.isSafeInteger(this.#sessionTtlMs) || this.#sessionTtlMs <= 0) {
			throw new BatchExecuteError("sessionTtlMs must be a positive integer");
		}
	}

	async getSession(signal?: AbortSignal): Promise<BatchExecuteSession> {
		if (this.#session && this.#session.expiresAt > Date.now()) return this.#session.value;

		let response: Response;
		try {
			response = await this.#fetch(this.#origin, { signal });
		} catch (error) {
			throw new BatchExecuteError(
				`session bootstrap failed: ${error instanceof Error ? error.message : error}`,
			);
		}
		if (!response.ok) {
			throw new BatchExecuteError(`session bootstrap returned HTTP ${response.status}`);
		}

		const value = extractWizSession(await response.text());
		this.#session = { value, expiresAt: Date.now() + this.#sessionTtlMs };
		return value;
	}

	async execute(
		rpcs: readonly BatchExecuteRpc[],
		opts: BatchExecuteCallOptions = {},
	) {
		const session = await this.getSession(opts.signal);
		const request = new PreparedBatchExecute({
			host: this.#origin.host,
			app: this.#app,
			user: opts.user,
			rpcs,
			requestId: opts.requestId,
			index: opts.index,
			responseMode: "c",
			params: {
				"f.sid": session.fSid,
				bl: session.bl,
				hl: this.#locale,
				"soc-app": 1,
				"soc-platform": 1,
				"soc-device": 1,
				...opts.params,
			},
			form: { at: session.at },
		});

		let response: Response;
		try {
			response = await this.#fetch(request.url, request.toRequestInit(opts.signal));
		} catch (error) {
			throw new BatchExecuteError(
				`batch request failed: ${error instanceof Error ? error.message : error}`,
			);
		}
		if (!response.ok) throw new BatchExecuteError(`batch request returned HTTP ${response.status}`);

		return decodeBatchExecuteResponse(
			await response.text(),
			"c",
			rpcs.map((rpc) => rpc.id),
		);
	}
}
