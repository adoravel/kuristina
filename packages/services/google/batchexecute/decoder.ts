/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	BatchExecuteError,
	type BatchExecuteResponse,
	type BatchExecuteResponseMode,
} from "./types.ts";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function parseEnvelope(raw: string): BatchExecuteResponse | undefined {
	let envelope: unknown;
	try {
		envelope = JSON.parse(raw);
	} catch (error) {
		throw new BatchExecuteError(
			`invalid batch envelope: ${error instanceof Error ? error.message : error}`,
		);
	}

	if (!Array.isArray(envelope) || !Array.isArray(envelope[0])) return undefined;
	const value = envelope[0];
	if (value[0] !== "wrb.fr" || typeof value[1] !== "string" || typeof value[2] !== "string") {
		return undefined;
	}

	let data: unknown;
	try {
		data = JSON.parse(value[2]);
	} catch (error) {
		throw new BatchExecuteError(
			`invalid response data for rpc ${value[1]}: ${
				error instanceof Error ? error.message : error
			}`,
		);
	}

	const rawIndex = value[6];
	const index = rawIndex === "generic" ? 1 : Number(rawIndex);
	if (!Number.isInteger(index) || index < 1) {
		throw new BatchExecuteError(`invalid response index for rpc ${value[1]}`);
	}

	return { index, rpcId: value[1], data };
}

function skipLine(bytes: Uint8Array, offset: number): number {
	while (offset < bytes.length && bytes[offset++] !== 10) {
		// no-op
	}
	return offset;
}

function decodeCompressed(raw: string): BatchExecuteResponse[] {
	const bytes = textEncoder.encode(raw);
	let offset = skipLine(bytes, 0);
	const decoded: BatchExecuteResponse[] = [];

	while (offset < bytes.length) {
		while (offset < bytes.length && [9, 10, 13, 32].includes(bytes[offset])) offset++;
		if (offset === bytes.length) break;

		const lineStart = offset;
		offset = skipLine(bytes, offset);
		const length = Number(textDecoder.decode(bytes.subarray(lineStart, offset - 1)));
		if (!Number.isSafeInteger(length) || length < 0 || offset + length > bytes.length) {
			throw new BatchExecuteError("invalid compressed batch envelope length");
		}

		const response = parseEnvelope(textDecoder.decode(bytes.subarray(offset, offset + length)));
		if (response) decoded.push(response);
		offset += length;
	}

	return decoded;
}

function decodeDefault(raw: string): BatchExecuteResponse[] {
	const bytes = textEncoder.encode(raw);
	let offset = skipLine(bytes, 0);
	offset = skipLine(bytes, offset);

	let envelopes: unknown;
	try {
		envelopes = JSON.parse(textDecoder.decode(bytes.subarray(offset)));
	} catch (error) {
		throw new BatchExecuteError(
			`invalid batch response: ${error instanceof Error ? error.message : error}`,
		);
	}
	if (!Array.isArray(envelopes)) throw new BatchExecuteError("batch response must be an array");

	return envelopes.flatMap((envelope) => {
		const response = parseEnvelope(JSON.stringify([envelope]));
		return response ? [response] : [];
	});
}

export function decodeBatchExecuteResponse(
	raw: string,
	responseMode?: BatchExecuteResponseMode,
	expectedRpcIds: readonly string[] = [],
): BatchExecuteResponse[] {
	if (responseMode === "b") throw new BatchExecuteError("protobuf responses are not supported");

	const responses = responseMode === "c" ? decodeCompressed(raw) : decodeDefault(raw);
	if (!responses.length) throw new BatchExecuteError("no RPC responses found");

	responses.sort((left, right) => left.index - right.index);
	if (expectedRpcIds.length) {
		const actual = responses.map((response) => response.rpcId);
		if (
			actual.length !== expectedRpcIds.length ||
			actual.some((id, index) => id !== expectedRpcIds[index])
		) {
			throw new BatchExecuteError("response RPC IDs do not match the request");
		}
	}

	return responses;
}
