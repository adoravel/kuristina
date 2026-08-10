/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { CreateMessageOptions } from "@discordeno/types";
import { arg, defineCommand } from "@kuristina/commands/core";
import { config } from "@kuristina/config";
import {
	extractBlobRefs as extractGitHub,
	fetchRepoMeta as ghMeta,
	fetchSnippet as ghSnippet,
} from "@kuristina/services/forges/github";
import { renderSnippet as renderGitHub } from "@kuristina/embeds/github";
import {
	extractBlobRefs as extractForgejo,
	fetchRepoMeta as fjMeta,
	fetchSnippet as fjSnippet,
} from "@kuristina/services/forges/forgejo";
import { renderSnippet as renderForgejo } from "@kuristina/embeds/forgejo";
import { fetchTweet, parseStatusUrl } from "@kuristina/services/social/twitter";
import { renderTweet } from "@kuristina/embeds/twitter";
import { fetchFediPost, parseFediUrl } from "@kuristina/services/social/fediverse";
import { renderFediPost } from "@kuristina/embeds/fediverse";
import { extractMusicUrls, resolveSongLink } from "@kuristina/services/music/links";
import { getMusicMetadata } from "@kuristina/services/music/metadata";
import { renderMusicLinkCard } from "@kuristina/embeds/musiclinks";
import { fetchBskyPost, parseBskyUrl } from "@kuristina/services/social/bluesky";
import { renderBskyPost } from "@kuristina/embeds/bluesky";

async function tryRender(url: string): Promise<CreateMessageOptions | undefined> {
	const { linkEmbeds } = config.modules;

	if (extractMusicUrls(url).length) {
		const link = await resolveSongLink(url);
		if (link.ok) {
			const metadata = link.value.artist
				? await getMusicMetadata(link.value.artist, link.value.title, link.value.kind ?? "song")
				: undefined;
			return renderMusicLinkCard(link.value, metadata?.ok ? metadata.value : undefined);
		}
	}

	if (linkEmbeds.twitter && parseStatusUrl(url)) {
		const tweet = await fetchTweet(url);
		if (tweet.ok) return renderTweet(tweet.value);
	}

	if (linkEmbeds.bluesky && parseBskyUrl(url)) {
		const tweet = await fetchBskyPost(url);
		if (tweet.ok) return renderBskyPost(tweet.value);
	}

	if (linkEmbeds.github) {
		const [ref] = extractGitHub(url);
		if (ref) {
			const snippet = await ghSnippet(ref);
			if (snippet.ok) {
				const meta = await ghMeta(ref.owner, ref.repo);
				return renderGitHub(ref, snippet.value, meta.ok ? meta.value : undefined);
			}
		}
	}

	if (linkEmbeds.forgejo) {
		const instances = linkEmbeds.forgejoInstances.split(",").map((s) => s.trim()).filter(Boolean);
		const [ref] = extractForgejo(url, instances);
		if (ref) {
			const snippet = await fjSnippet(ref);
			if (snippet.ok) {
				const meta = await fjMeta(ref.instance, ref.owner, ref.repo);
				return renderForgejo(ref, snippet.value, meta.ok ? meta.value : undefined);
			}
		}
	}

	if (linkEmbeds.fediverse && parseFediUrl(url)) {
		const post = await fetchFediPost(url);
		if (post.ok) return renderFediPost(post.value);
	}

	return undefined;
}

export default defineCommand({
	aliases: "embed",
	description: "Shows a rich for a GitHub/Forgejo/Twitter/Bluesky/Fediverse/song/album link.",
	args: {
		url: arg.string({ description: "The link to embed", required: true, greedy: true }),
	},
	async exec(ctx) {
		const payload = await tryRender(ctx.args.url);
		if (!payload) {
			return void await ctx.error(
				"mb but that doesn't rly look like a link i know how to embed mate",
			);
		}
		await ctx.reply(payload);
	},
});
