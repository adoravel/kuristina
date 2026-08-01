/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { getConfig } from "@kuristina/config";

export const Theme = {
	get colours() {
		return getConfig().design.colours;
	},
	get emoji() {
		return getConfig().design.emojis;
	},
	get branding() {
		return getConfig().design.branding;
	},
	get wordmark(): string {
		const raw = getConfig().design.emojis.wordmark;
		if (!raw) return getConfig().design.branding.name;
		const [name, id] = raw.split(":");
		return id ? `<:${name}:${id}>` : raw;
	},
	get prefix(): string {
		const lut = ["!", "/", "kuristina ", "kuri ", "kurii ", "kuriii ", "kurie ", "kuris ", "kuriis ", "kuriiis ", "kuriss ", ":3 ", ":3c "];
		return lut[Math.floor(Math.random() * lut.length)];
	},
} as const;
