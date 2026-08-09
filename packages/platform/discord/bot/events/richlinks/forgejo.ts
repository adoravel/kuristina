/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { config } from "@kuristina/config";
import { extractBlobRefs, fetchSnippet } from "@kuristina/services/forges/codeberg";
import { renderSnippet } from "@kuristina/embeds/codeberg";
import { reconcileCompanions } from "./shared.ts";
import type { Message } from "../../types.ts";
import type discord from "../../bot.ts";
import type { MessageCompanion } from "@kuristina/database";

export async function handleCodebergLinks(
	bot: typeof discord,
	message: Message,
	ex?: MessageCompanion[],
): Promise<void> {
	if (!config.modules.linkEmbeds.codeberg) return;
	if (!message.content.includes("codeberg.org")) return;

	const refs = extractBlobRefs(message.content).slice(0, config.modules.linkEmbeds.maxPerMessage);
	if (!refs.length) return;

	await reconcileCompanions(
		bot,
		message,
		"richlink:codeberg",
		refs,
		(ref) =>
			`${ref.owner}/${ref.repo}/${ref.path}#L${ref.startLine ?? ""}-L${
				ref.endLine ?? ""
			}@${ref.ref}`,
		async (ref) => {
			const snippet = await fetchSnippet(ref);
			return snippet.ok ? renderSnippet(ref, snippet.value) : undefined;
		},
		ex,
	);
}
