/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand } from "~/lib/command/registry.tsx";
import { memberIds } from "~/lib/command/primitives.ts";
import { resolveMembers } from "discord/resolve";

export default defineCommand("ping", {
	users: memberIds,
}, async (ctx) => {
	const members = await resolveMembers(ctx.args.users);
	console.log(members);
	await ctx.success(`Pong! ${members.map((u) => u.id)}`);
});
