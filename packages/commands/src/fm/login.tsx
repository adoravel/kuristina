/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { identifier, optional } from "@kuristina/commands";
import { defineCommand } from "@kuristina/commands/registry";
import { repositories } from "@kuristina/database";
import { getAuthToken, pollForSession } from "@kuristina/services/lastfm";
import { describe } from "@kuristina/errors";
// @ts-types="@kuristina/discord-ui"
import { Theme } from "@kuristina/discord-ui";

const PROVIDER = "lastfm" as const;

export default defineCommand(["lastfm", "fm"], {
	$: optional(identifier),
}, async (ctx) => {
	const sub = ctx.remaining?.trim().toLowerCase();

	if (sub === "logout") {
		const result = await repositories.scrobble.unlink(ctx.user.id, PROVIDER);
		if (!result.ok) {
			return void await ctx.error("failed to unlink your account, try again in a moment");
		}
		return void await ctx.success("unlinked your last.fm account");
	}

	if (sub === "login") {
		const tokenResult = await getAuthToken();
		if (!tokenResult.ok) return void await ctx.error(describe(tokenResult.error));

		const { token, authUrl } = tokenResult.value;

		await ctx.reply(
			<message>
				<h3>Link your Last.fm account</h3>
				<p>
					<a href={authUrl}>Click here to authorise kuristina</a>, then come back. I'll pick it up
					for you automatically, sweetie~ &lt;3<br></br>
					<sub>This link expires in a few minutes.</sub>
				</p>
			</message>,
		);

		const sessionResult = await pollForSession(token);
		if (!sessionResult.ok) return void await ctx.error(describe(sessionResult.error));

		const { username } = sessionResult.value;
		const linkResult = await repositories.scrobble.link(ctx.user.id, PROVIDER, username, true);
		if (!linkResult.ok) {
			return void await ctx.error("authenticated, but failed to save your account. try again");
		}

		return void await ctx.success(`linked as **${username}**`);
	}

	const current = await repositories.scrobble.getDefault(ctx.user.id);
	if (!current.ok) return void await ctx.error("failed to look up your linked account");

	if (!current.value) {
		return void await ctx.reply(
			<message>
				<h3>No account linked</h3>
				<p>
					Run <kbd>{Theme.prefix}lastfm login</kbd> to get started.
				</p>
			</message>,
		);
	}

	await ctx.reply(
		<message>
			<h3>Linked account</h3>
			<p>
				<strong>{current.value.provider}</strong>: {current.value.username}
			</p>
		</message>,
	);
}, {
	description:
		"Links, unlinks, or shows your Last.fm account. Use `login`/`logout` as a subcommand.",
	category: "lastfm",
	cooldownMs: 5000,
});
