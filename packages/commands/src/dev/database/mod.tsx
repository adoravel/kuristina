/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand } from "@kuristina/commands/core";
import { ownerOnly } from "@kuristina/commands/core";
import inspect from "./inspect.tsx";
import set from "./set.tsx";
import del from "./delete.tsx";
import undo from "./undo.tsx";
import history from "./history.tsx";

export default defineCommand({
	aliases: ["database", "db"],
	surfaces: "text",
	description: "Inspect and manage database rows, with diff preview and undo.",
	middleware: [ownerOnly],
	subcommands: [inspect, set, del, undo, history],
	async exec() {},
});
