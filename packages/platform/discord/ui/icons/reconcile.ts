/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { registeredIcons } from "./registry.ts";
import { getEmojiName, type IconManifestEntry } from "./manifest.ts";

export interface RemoteEmoji {
	id: bigint;
	name: string | undefined;
	animated: boolean | undefined;
}

export interface StoredIconRow {
	sourceHash: string;
	emojiId: string;
	animated: boolean;
}

export interface VendoredIcon {
	key: string;
	bytes: Uint8Array<ArrayBuffer>;
	hash: string;
}

export type IconAction =
	| { kind: "keep"; key: string; entry: IconManifestEntry }
	| {
		kind: "upload";
		key: string;
		name: string;
		bytes: Uint8Array<ArrayBuffer>;
		hash: string;
		replacing?: RemoteEmoji;
	}
	| { kind: "delete_orphan"; remote: RemoteEmoji };

export interface IconPlan {
	actions: IconAction[];
	skippedNoVendoredAsset: string[];
}

export function planIconReconciliation(
	vendored: VendoredIcon[],
	existing: ReadonlyMap<string, StoredIconRow>,
	remoteEmojis: RemoteEmoji[],
): IconPlan {
	const remotesByName = new Map(remoteEmojis.map((e) => [e.name, e]));
	const registeredNames = new Set(Object.keys(registeredIcons));
	const actions: IconAction[] = [];
	const skippedNoVendoredAsset: string[] = [];

	const vendoredKeys = new Set(vendored.map((v) => v.key));
	for (const key of registeredNames) {
		if (!vendoredKeys.has(key)) skippedNoVendoredAsset.push(key);
	}

	for (const { key, bytes, hash } of vendored) {
		const row = existing.get(key);
		const name = getEmojiName(key);
		const remote = remotesByName.get(name);

		if (row && remote?.id !== undefined && row.sourceHash === hash) {
			actions.push({
				kind: "keep",
				key,
				entry: { id: remote.id, animated: remote.animated ?? false },
			});
			continue;
		}

		actions.push({ kind: "upload", key, name, bytes, hash, replacing: remote });
	}

	const paddedRegisteredNames = new Set([...registeredNames].map(getEmojiName));
	for (const remote of remoteEmojis) {
		if (remote.name && !paddedRegisteredNames.has(remote.name)) {
			actions.push({ kind: "delete_orphan", remote });
		}
	}

	return { actions, skippedNoVendoredAsset };
}
