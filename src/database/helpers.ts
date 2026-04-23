/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * encodes a BigInt Snowflake into an 8-byte Uint8Array for SQLite `BLOB` storage
 */
export function encodeSnowflake(snowflake: bigint): Uint8Array {
	const buffer = new Uint8Array(8);
	const view = new DataView(buffer.buffer);
	view.setBigUint64(0, snowflake, false);
	return buffer;
}

/**
 * decodes an 8-byte Uint8Array from a SQLite `BLOB` back into a BigInt
 */
export function decodeSnowflake(buffer: Uint8Array): bigint {
	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	return view.getBigUint64(0, false);
}
