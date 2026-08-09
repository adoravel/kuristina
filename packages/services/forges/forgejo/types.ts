/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface ForgejoBlobRef {
	instance: string;
	owner: string;
	repo: string;
	refKind: "branch" | "commit";
	ref: string;
	path: string;
	startLine?: number;
	endLine?: number;
}
