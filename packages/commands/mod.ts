/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

export * from "./lib/mod.ts";

const cmd = (_: TemplateStringsArray, ...values: string[]) =>
	import(`./src/${values[0]}.tsx`).then((m) => m.default);

/** meow */
export const commands = {
	get help() {
		return cmd`help`;
	},
	get ping() {
		return cmd`ping`;
	},
	get role() {
		return cmd`role`;
	},
	get translate() {
		return cmd`translate`;
	},
	get whoknows() {
		return cmd`whoknows`;
	},
	get lastfm() {
		return cmd`login`;
	},
	get all() {
		return [this.help, this.ping, this.role, this.translate, this.whoknows, this.lastfm];
	},
};
