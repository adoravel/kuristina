import { type RetryOptions, withRetry } from "./retry.ts";
import { Errors, type NetworkError } from "../errors.ts";
import { err, ok, type Result } from "../result.ts";

export interface FetchOptions extends RequestInit {
	retry?: RetryOptions;
	mapError?: (e: unknown) => NetworkError;
}

const defaultMapError = (e: unknown): NetworkError =>
	Errors.network(e instanceof Error ? e.message : String(e));

export async function fetchWithRetry<T>(
	input: RequestInfo | URL,
	init?: FetchOptions,
	json: boolean = true,
): Promise<Result<T, NetworkError>> {
	const { retry, mapError = defaultMapError, ...fetchInit } = init ?? {};
	try {
		const response = await withRetry(
			() => fetch(input, fetchInit),
			retry ?? { maxAttempts: 3, baseDelayMs: 500 },
		);
		if (!response.ok) {
			return err(Errors.network(`HTTP ${response.status}`, response.status));
		}

		const text = await response.text();
		try {
			return ok(JSON.parse(text) as T);
		} catch {
			if (!json) {
				return err(Errors.network(`Invalid JSON response: ${JSON.stringify(text, null, 4)}}`));
			}
			return ok(text as T);
		}
	} catch (e) {
		return err(mapError(e));
	}
}
