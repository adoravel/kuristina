/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

export * from "./lib/mod.ts";

export const commands = {
	get help() {
		return import("./src/help.tsx").then((m) => m.default);
	},
	get ping() {
		return import("./src/ping.ts").then((m) => m.default);
	},
	get role() {
		return import("./src/role.tsx").then((m) => m.default);
	},
	get translate() {
		return import("./src/translate.tsx").then((m) => m.default);
	},
};
