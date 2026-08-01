/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

export * from "./lib/mod.ts";

const cmd = (path: string) => import(`./src/${path}.tsx`).then((m) => m.default);

/** meow */
export const commands = {
	get help() {
		return cmd("help");
	},
	get ping() {
		return cmd("ping");
	},
	get role() {
		return cmd("role");
	},
	get translate() {
		return cmd("translate");
	},
	fm: {
		get whoknows() {
			return cmd("fm/whoknows");
		},
		get auth() {
			return cmd("fm/login");
		},
	},
	markov: {
		get forget() {
			return cmd("markov/forget");
		},
		get prune() {
			return cmd("markov/prune");
		},
	},
	dev: {
		get restart() {
			return cmd("dev/restart");
		},
		get update() {
			return cmd("dev/update");
		},
	},
	get all() {
		return [
			this.help,
			this.ping,
			this.role,
			this.translate,
			this.fm.whoknows,
			this.fm.auth,
			this.markov.forget,
			this.markov.prune,
			this.dev.restart,
			this.dev.update,
		];
	},
};
