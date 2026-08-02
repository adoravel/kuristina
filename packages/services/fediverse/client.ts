/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { fetchWithRetry, type Result } from "@kuristina/core";
import type { NetworkError } from "@kuristina/core";
import type { FediPostInfo } from "./types.ts";

interface ActivityPubNote {
	attributedTo?: string | { name?: string };
	content?: string;
	attachment?: { url?: string }[];
}

export async function fetchFediPost(url: string): Promise<Result<FediPostInfo, NetworkError>> {
	const result = await fetchWithRetry<ActivityPubNote>(url, {
		headers: { Accept: "application/activity+json" },
		retry: { maxAttempts: 2, baseDelayMs: 500 },
	});
	if (!result.ok) return result;

	const handleFromUrl = url.match(/@([\w.-]+)/)?.[1] ?? "unknown";
	const attributedTo = result.value.attributedTo;
	const author = typeof attributedTo === "object" && attributedTo?.name
		? attributedTo.name
		: handleFromUrl;
	const content = String(result.value.content ?? "").replace(/<[^>]+>/g, "").trim();
	const attachmentUrls = (result.value.attachment ?? [])
		.map((a) => a.url).filter((u): u is string => typeof u === "string");

	return { ok: true, value: { author, content, url, attachmentUrls } };
}
