/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const masterKey = fromBase64("UIlTTEMmmLfGowo/UC60x2H45W6MdGgTRfo/umg4754=");

export interface DecryptionKey {
	readonly key: BufferSource; // 16 bytes, AES-128
	readonly nonce: Uint8Array; // 8 bytes
}

function fromBase64(input: string): Uint8Array<ArrayBuffer> {
	return Uint8Array.fromBase64(input);
}

function importAesCbc(key: BufferSource): Promise<CryptoKey> {
	return crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]);
}

function importAesCtr(key: BufferSource): Promise<CryptoKey> {
	return crypto.subtle.importKey("raw", key, { name: "AES-CTR" }, false, ["decrypt"]);
}

async function decrypt(
	algo: AlgorithmIdentifier | AesCbcParams | AesCtrParams,
	key: CryptoKey,
	data: BufferSource,
): Promise<Uint8Array> {
	return new Uint8Array(
		await crypto.subtle.decrypt(algo, key, data),
	);
}

export async function deriveDecryptionKey(input: string): Promise<DecryptionKey> {
	const keyId = fromBase64(input);

	const iv = keyId.subarray(0, 16);
	const enc = keyId.subarray(16);

	const cryptoKey = await importAesCbc(masterKey);

	const dec = await decrypt({ name: "AES-CBC", iv }, cryptoKey, enc);

	if (dec.length < 24) {
		throw new Error("decrypted data is too short to contain key and nonce");
	}

	const key = dec.slice(0, 16);
	const nonce = dec.slice(16, 24);

	return { key, nonce };
}

export async function createDecipheriv({ key, nonce }: DecryptionKey) {
	const counter = new Uint8Array(16);
	counter.set(nonce); // nonce (8 bytes) + 8 zero bytes

	const cryptoKey = await importAesCtr(key);

	return (data: BufferSource): Promise<Uint8Array> =>
		decrypt({ name: "AES-CTR", counter }, cryptoKey, data);
}
