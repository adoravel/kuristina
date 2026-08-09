/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { ForgejoBlobRef } from "./types.ts";

function buildBlobPattern(instances: readonly string[]): RegExp {
	const hosts = instances.map((h) => h.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
	return new RegExp(
		`https:\\/\\/(${hosts})\\/([\\w.-]+)\\/([\\w.-]+)\\/src\\/(branch|commit)\\/([^/\\s]+)\\/([^\\s#?]+)(?:#L(\\d+)(?:-L?(\\d+))?)?`,
		"g",
	);
}

export function extractBlobRefs(content: string, instances: readonly string[]): ForgejoBlobRef[] {
	if (!instances.length) return [];
	return [...content.matchAll(buildBlobPattern(instances))].map((
		[, instance, owner, repo, refKind, ref, path, start, end],
	) => ({
		instance,
		owner,
		repo,
		refKind: refKind as "branch" | "commit",
		ref,
		path: decodeURIComponent(path),
		startLine: start ? parseInt(start, 10) : undefined,
		endLine: end ? parseInt(end, 10) : start ? parseInt(start, 10) : undefined,
	}));
}
