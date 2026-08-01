import type { BigString } from "@discordeno/types";
import type { RegisteredIconName } from "./registry.ts";

export interface IconManifestEntry {
	id: BigString;
	animated: boolean;
}

let manifest: Record<string, IconManifestEntry> = {};
let populated = false;

export function setIconManifest(entries: Record<string, IconManifestEntry>): void {
	manifest = entries;
	populated = true;
}

export function getEmojiName(registeredKey: string): string {
	if (registeredKey.length === 1) return registeredKey + "_";
	return registeredKey.slice(0, 32);
}

export function iconMarkdown(name: RegisteredIconName): string {
	if (!populated) {
		throw new Error(`icon "${name}" requested before reconcileIcons() completed`);
	}
	const entry = manifest[name];
	if (!entry) {
		throw new Error(`icon "${name}" is registered but wasn't uploaded`);
	}
	return `<${entry.animated ? "a" : ""}:${getEmojiName(name)}:${entry.id}>`;
}
