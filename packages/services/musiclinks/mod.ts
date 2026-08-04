/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { type AsyncResult, err, Errors, flatMapAsync, ok } from "@kuristina/core";
import type { NetworkError } from "@kuristina/core";
import type { SqlError } from "@kuristina/database";
import { repositories } from "@kuristina/database";
import { normaliseSongUrl } from "./utils.ts";
import { resolveViaOdesli } from "./odesli.ts";
import { findAppleMusicUrl } from "./itunes.ts";
import type { MusicLinkResult } from "./types.ts";

async function backfillAppleMusic(result: MusicLinkResult): Promise<MusicLinkResult> {
	if (result.links.appleMusic) return result;
	const appleUrl = await findAppleMusicUrl(result.title, result.artist);
	return appleUrl
		? { ...result, links: { ...result.links, appleMusic: appleUrl }, source: "odesli+itunes" }
		: result;
}

export function resolveSongLink(
	rawUrl: string,
): AsyncResult<MusicLinkResult, NetworkError | SqlError> {
	const normalised = normaliseSongUrl(rawUrl);

	return flatMapAsync(repositories.musicLinks.get<MusicLinkResult>(normalised))(async (hit) => {
		if (hit) return ok(hit);

		return await flatMapAsync<MusicLinkResult, any>(resolveViaOdesli(normalised))(
			async (resolved) => {
				const final = await backfillAppleMusic(resolved);
				await repositories.musicLinks.set(normalised, final);
				return ok(final);
			},
		);
	});
}

export async function resolveSongLinkByQuery(
	artist: string,
	title: string,
): AsyncResult<MusicLinkResult, NetworkError | SqlError> {
	const appleUrl = await findAppleMusicUrl(title, artist);
	if (!appleUrl) {
		return err(Errors.network(`no match found for "${title}" by "${artist}"`));
	}
	return await resolveSongLink(appleUrl);
}

export * from "./types.ts";
export * from "./utils.ts";
