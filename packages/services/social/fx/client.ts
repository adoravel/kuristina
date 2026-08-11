/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
	type AsyncResult,
	err,
	Errors,
	fetchWithRetry,
	type NetworkError,
	ok,
} from "@kuristina/core";
import type { FxResponse, FxStatus } from "./types.ts";

export interface FxClientOptions {
	baseUrl: string;
	platform: string;
}

export function createFxClient(opts: FxClientOptions) {
	const { baseUrl, platform } = opts;

	async function fetchStatus(
		path: string,
	): AsyncResult<FxStatus, NetworkError> {
		const url = `${baseUrl}/${path}`;
		const result = await fetchWithRetry<FxResponse>(url, {
			retry: { maxAttempts: 2, baseDelayMs: 500 },
		});

		if (!result.ok) return result;

		const response = result.value;
		if (response.code !== 200) {
			return err(
				Errors.network(
					`${platform} returned code ${response.code}: ${response.message}`,
				),
			);
		}

		const status = response.tweet ?? response.status;
		if (!status) {
			return err(Errors.network(`${platform} returned no status payload`));
		}

		return ok(status);
	}

	return { fetchStatus };
}
