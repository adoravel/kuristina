/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { err, map, type Result } from "@kuristina/core";
import { Errors, type NetworkError } from "@kuristina/core";
import {
	createFxClient,
	type FxStatus,
	isTombstone,
	mapFxMedia,
	mapFxTombstone,
	mapFxTranslation,
	type MappedMedia,
	parseLanguage,
	parseTwitterUrl,
} from "./mod.ts";
import type { FxTombstone } from "./types.ts";

export interface TwitterInfo {
	author: string;
	handle: string;
	authorAvatar?: string;
	text: string;
	url: string;
	likes: number;
	retweets: number;
	replies: number;
	mediaURLs: string[];
	mediaExtended: MappedMedia[];
	date: string;
	dateEpoch: number;
	tweetURL: string;
	possiblySensitive: boolean;
	communityNote?: string;
	quoted?: TwitterInfo;
	isRetweet: boolean;
	translation?: {
		text: string;
		sourceLang: string;
		targetLang: string;
		sourceLangEn: string;
		provider: string;
	};
}

const client = createFxClient({
	baseUrl: "https://api.fxtwitter.com",
	platform: "fxtwitter",
});

function mapTwitterStatus(
	status: FxStatus | FxTombstone,
	lang?: string,
): TwitterInfo {
	if (isTombstone(status)) {
		return {
			...mapFxTombstone(status),
			tweetURL: "",
			isRetweet: false,
		};
	}

	let text = status.text;
	let translation;

	if (lang && status.translation) {
		translation = mapFxTranslation(status.translation);
		text = status.translation.text;
	}

	return {
		author: status.author.name,
		handle: status.author.screen_name,
		authorAvatar: status.author.avatar_url,
		text,
		url: status.url,
		likes: status.likes ?? 0,
		retweets: status.retweets ?? 0,
		replies: status.replies ?? 0,
		mediaURLs: (status.media?.all ?? []).map((m) => m.url),
		mediaExtended: mapFxMedia(status.media?.all),
		date: status.created_at,
		dateEpoch: status.created_timestamp,
		tweetURL: status.url,
		possiblySensitive: status.possibly_sensitive ?? false,
		communityNote: status.community_note?.text,
		quoted: status.quote ? mapTwitterStatus(status.quote, lang) : undefined,
		isRetweet: !!status.reposted_by,
		translation,
	};
}

export async function fetchTwitter(
	url: string,
	lang?: string,
): Promise<Result<TwitterInfo, NetworkError>> {
	const parsed = parseTwitterUrl(url);
	if (!parsed) {
		return err(Errors.network("not a recognised Twitter status URL"));
	}

	const targetLang = parsed.lang ?? lang;
	const language = targetLang ? parseLanguage(targetLang) : undefined;
	let path = `${parsed.handle}/status/${parsed.id}`;
	if (language) {
		path += `/${language}`;
	}

	const result = await client.fetchStatus(path);
	return map(result)((status) => mapTwitterStatus(status, language));
}
