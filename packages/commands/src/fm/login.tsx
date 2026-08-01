/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { type AsyncResult, flatMapAsync, mapAsync, tapErrorAsync } from "@kuristina/core";
import { identifier, optional } from "@kuristina/commands";
import { type CommandExecutionContext, defineCommand } from "@kuristina/commands/registry";
import { repositories } from "@kuristina/database";
import { getAuthToken, pollForSession } from "@kuristina/services/lastfm";
import { type AppError, describe } from "@kuristina/errors";
import { Theme } from "@kuristina/discord-ui";

const PROVIDER = "lastfm" as const;

const AuthMessage = ({ authUrl }: { authUrl: string }) => (
	<message>
		<h3>Link your Last.fm account</h3>
		<p>
			<a href={authUrl}>Click here to authorise {Theme.branding.name}</a>, then come back. I'll pick
			it up for you automatically, sweetie~ &lt;3<br></br>
			<sub>This link expires in a few minutes.</sub>
		</p>
	</message>
);

function logout(
	ctx: CommandExecutionContext<{ $?: string | null }, string>,
): AsyncResult<void, AppError> {
	const unlink = repositories.scrobble.unlink(ctx.user.id, PROVIDER);
	return mapAsync(unlink)(
		async () => void await ctx.success("unlinked your last.fm account"),
	);
}

function login(
	ctx: CommandExecutionContext<{ $?: string | null }, string>,
): AsyncResult<void, AppError> {
	const login = flatMapAsync(getAuthToken())(async ({ token, authUrl }) => {
		await ctx.reply(<AuthMessage authUrl={authUrl} />);
		return await pollForSession(token);
	});

	return flatMapAsync(login)(({ username }) => {
		const link = repositories.scrobble.link(ctx.user.id, PROVIDER, username, true);
		return mapAsync<void, any>(link)(async () => void await ctx.success(`linked as ${username}`));
	});
}

function showLinkedAccount(
	ctx: CommandExecutionContext<{ $?: string | null }, string>,
): AsyncResult<void, AppError> {
	const current = repositories.scrobble.getDefault(ctx.user.id);

	return mapAsync(current)(async (account) => {
		if (!account) {
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
					<strong>{account.provider}</strong>: {account.username}
				</p>
			</message>,
		);
	});
}

export default defineCommand(["lastfm", "fm"], {
	$: optional(identifier),
}, async (ctx) => {
	const sub = ctx.remaining?.trim().toLowerCase();

	if (sub === "logout") {
		return void tapErrorAsync(logout(ctx))(async (error) => void await ctx.error(describe(error)));
	}

	if (sub === "login") {
		return void tapErrorAsync(login(ctx))(async (error) => void await ctx.error(describe(error)));
	}

	await tapErrorAsync(showLinkedAccount(ctx))(async (error) =>
		void await ctx.error(describe(error))
	);
}, {
	description:
		"Links, unlinks, or shows your Last.fm account. Use `login`/`logout` as a subcommand.",
	category: "lastfm",
	cooldownMs: 5000,
});
