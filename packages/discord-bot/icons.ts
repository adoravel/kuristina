import { encodeBase64 } from "@std/encoding/base64";
import { encodeHex } from "@std/encoding/hex";
import { repositories } from "@kuristina/database";
import {
	// @ts-types="@kuristina/discord-ui"
	getEmojiName,
	type IconManifestEntry,
	registeredIcons,
	setIconManifest,
	VENDORED_ICONS_DIR,
} from "@kuristina/discord-ui";
import type discord from "./bot.ts";

async function hash(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
	return encodeHex(await crypto.subtle.digest("SHA-256", bytes));
}

export async function reconcileIcons(bot: typeof discord): Promise<void> {
	const existing = await repositories.icon.getAll();
	if (!existing.ok) {
		console.error("  · icons: failed to read icon_emojis:", existing.error);
		return;
	}

	let emojis: Awaited<ReturnType<typeof bot.helpers.getApplicationEmojis>>["items"];
	try {
		emojis = (await bot.helpers.getApplicationEmojis()).items;
	} catch (e) {
		console.error("  · icons: failed to list application emojis:", e);
		return;
	}

	const remotes = new Map(
		emojis.map((e) => [e.name, { id: e.id as IconManifestEntry["id"], animated: e.animated }]),
	);
	const manifest: Record<string, IconManifestEntry> = {};
	const registeredNames = new Set(Object.keys(registeredIcons));

	for (const key of registeredNames) {
		let bytes: Uint8Array<ArrayBuffer>;
		try {
			bytes = await Deno.readFile(new URL(`${key}.png`, VENDORED_ICONS_DIR));
		} catch {
			console.warn(`  · icons: no vendored PNG for "${key}", skipping`);
			continue;
		}

		const hashed = await hash(bytes);
		const row = existing.value.get(key);
		const name = getEmojiName(key);
		const remote = remotes.get(name);

		if (row && remote?.id && row.sourceHash === hashed) {
			manifest[key] = { id: remote.id, animated: remote.animated ?? false };
			continue;
		}

		if (remote) {
			try {
				await bot.helpers.deleteApplicationEmoji(remote.id!);
				console.log(`  · icons: deleted old "${key}" (${remote.id})`);
			} catch (e) {
				console.error(`  · icons: failed to delete old "${key}":`, e);
				if (row) {
					manifest[key] = { id: row.emojiId, animated: row.animated };
				}
				continue;
			}
		}

		try {
			const image = `data:image/png;base64,${encodeBase64(bytes)}`;
			const emoji = await bot.helpers.createApplicationEmoji({ name, image });
			await repositories.icon.upsert(key, emoji.id!.toString(), !!emoji.animated, hashed);
			manifest[key] = { id: emoji.id!, animated: !!emoji.animated };
			console.log(`  · icons: uploaded "${key}" as "${name}" -> ${emoji.id}`);
		} catch (e) {
			console.error(`  · icons: failed to upload "${key}":`, e);
			if (row) {
				manifest[key] = { id: row.emojiId, animated: row.animated };
			}
		}
	}

	for (const [name, remote] of remotes) {
		if (!registeredNames.has(name!)) {
			try {
				await bot.helpers.deleteApplicationEmoji(remote.id);
				console.log(`  · icons: deleted orphaned "${name}" (${remote.id})`);
			} catch (e) {
				console.error(`  · icons: failed to delete orphaned "${name}":`, e);
			}
		}
	}

	setIconManifest(manifest);
}
