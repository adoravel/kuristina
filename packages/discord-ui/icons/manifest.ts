/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import type { BigString } from "@discordeno/types";
import type { RegisteredIconName } from "./registry.ts";

export interface IconManifestEntry {
	readonly id: BigString;
	readonly animated: boolean;
}

let manifest: Readonly<Record<string, IconManifestEntry>> | null = null;

export const getEmojiName = (registeredKey: string): string =>
	registeredKey.length === 1 ? `${registeredKey}_` : registeredKey.slice(0, 32);

const formatDiscordEmoji = (name: string, id: BigString, animated: boolean): string =>
	`<${animated ? "a" : ""}:${name}:${id}>`;

export const setIconManifest = (entries: Record<string, IconManifestEntry>): void => {
	manifest = Object.freeze({ ...entries });
};

export const tryIconMarkdown = (name: RegisteredIconName): string | undefined => {
	if (!manifest) return undefined;

	const entry = manifest[name];
	if (!entry) return undefined;

	return formatDiscordEmoji(getEmojiName(name), entry.id, entry.animated);
};

export const iconMarkdown = (name: RegisteredIconName): string => {
	if (!manifest) {
		throw new Error(
			`icon manifest not loaded: icon "${name}" was requested before setIconManifest() was called`,
		);
	}

	const markdown = tryIconMarkdown(name);
	if (!markdown) {
		throw new Error(
			`icon missing: "${name}" is registered in code but wasn't found in the uploaded manifest`,
		);
	}

	return markdown;
};
