/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { config } from "@kuristina/config";
import { log } from "./consumer.ts";

export function applyReplacements(text: string, guildId?: bigint): string {
	const { replacements, serverReplacements } = config.modules.markov;

	let result = run(text, replacements);

	if (guildId !== undefined) {
		const perServer = serverReplacements[guildId.toString()];
		if (perServer) result = run(result, perServer);
	}

	return result;
}

function run(text: string, rules: Record<string, string>): string {
	let result = text;
	for (const [pattern, replacement] of Object.entries(rules)) {
		try {
			result = result.replace(new RegExp(pattern, "ig"), replacement);
		} catch (e) {
			log(`invalid replacement pattern "${pattern}": ` + e);
		}
	}
	return result;
}
