/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import { extractBlobRefs, fetchRepoMeta, fetchSnippet } from "@kuristina/services/forges/github";
import { renderSnippet } from "@kuristina/embeds/github";
import { reconcileCompanions } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import type { MessageCompanion } from "@kuristina/database";

export async function handleGitHubLinks(
	bot: typeof discord,
	message: Message,
	ex?: MessageCompanion[],
): Promise<void> {
	if (!config.modules.linkEmbeds.github) return;
	if (!message.content.includes("github.com")) return;

	const refs = extractBlobRefs(message.content).slice(0, config.modules.linkEmbeds.maxPerMessage);
	if (!refs.length) return;

	await reconcileCompanions(
		bot,
		message,
		"richlink:github",
		refs,
		(ref) =>
			`${ref.owner}/${ref.repo}/${ref.path}#L${ref.startLine ?? ""}-L${
				ref.endLine ?? ""
			}@${ref.ref}`,
		async (ref) => {
			const snippet = await fetchSnippet(ref);

			if (!snippet.ok) return undefined;
			const meta = await fetchRepoMeta(ref.owner, ref.repo);
			return renderSnippet(ref, snippet.value, meta.ok ? meta.value : undefined);
		},
		ex,
	);
}
