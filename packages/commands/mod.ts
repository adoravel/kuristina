/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { registerCommand } from "@kuristina/commands/core";

const cmd = (path: string) => import(`./src/${path}.tsx`).then((m) => m.default);

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
		get root() {
			return import("./src/fm/mod.ts").then((m) => m.default);
		},
		get nowplaying() {
			return cmd("fm/nowplaying");
		},
		get whoknows() {
			return cmd("fm/whoknows");
		},
		get whoknowsalbum() {
			return cmd("fm/whoknowsalbum");
		},
		get whoknowstrack() {
			return cmd("fm/whoknowstrack");
		},
		get love() {
			return import("./src/fm/rate.tsx").then(($) => $.love);
		},
		get unrate() {
			return import("./src/fm/rate.tsx").then(($) => $.unrate);
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
		get database() {
			return cmd("dev/database/mod");
		},
	},
	get all() {
		return [
			this.help,
			this.ping,
			this.role,
			this.translate,
			this.fm.root,
			this.fm.nowplaying,
			this.fm.whoknows,
			this.fm.whoknowsalbum,
			this.fm.whoknowstrack,
			this.fm.love,
			this.fm.unrate,
			this.markov.forget,
			this.markov.prune,
			this.dev.restart,
			this.dev.update,
			this.dev.database,
		];
	},
};

export async function registerAllCommands(): Promise<void> {
	for (const spec of await Promise.all(commands.all)) registerCommand(spec);
}
