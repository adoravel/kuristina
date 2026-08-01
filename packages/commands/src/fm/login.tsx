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

function AuthMessage({ authUrl }: { authUrl: string }) {
	return (
		<message>
			<h3>
				<icon name="link" /> Link your Last.fm account
			</h3>
			<p>
				<a href={authUrl}>Click here ↗</a> to authorise{" "}
				{Theme.branding.name}, then come back. I'll pick it up for you automatically, sweetie~ &lt;3
			</p>
			<hr spacing={2} />
			<sub>This link expires in a few minutes.</sub>
		</message>
	);
}

function LinkedMessage({ username }: { username: string }) {
	return (
		<message>
			<h3>
				<icon name="check" /> Linked to Last.fm
			</h3>
			<p>
				Linked as <strong>{username}</strong>.
			</p>
		</message>
	);
}

function UnlinkedMessage() {
	return (
		<message>
			<h3>
				<icon name="x" /> Unlinked
			</h3>
			<p>Removed your Last.fm account link.</p>
		</message>
	);
}

function NoAccountMessage() {
	return (
		<message>
			<h3>
				<icon name="link" /> No account linked
			</h3>
			<p>
				Run <kbd>{Theme.prefix}lastfm login</kbd> to get started.
			</p>
		</message>
	);
}

function AccountMessage({ provider, username }: { provider: string; username: string }) {
	return (
		<message>
			<h3>
				<icon name="music" /> Linked account
			</h3>
			<p>
				<strong>{provider}</strong>: {username}
			</p>
		</message>
	);
}

function logout(
	ctx: CommandExecutionContext<{ $?: string | null }, string>,
): AsyncResult<void, AppError> {
	const unlink = repositories.scrobble.unlink(ctx.user.id, PROVIDER);
	return mapAsync(unlink)(async () => void await ctx.reply(<UnlinkedMessage />));
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
		return mapAsync<void, any>(link)(
			async () => void await ctx.reply(<LinkedMessage username={username} />),
		);
	});
}

function showLinkedAccount(
	ctx: CommandExecutionContext<{ $?: string | null }, string>,
): AsyncResult<void, AppError> {
	const current = repositories.scrobble.getDefault(ctx.user.id);

	return mapAsync(current)(async (account) => {
		if (!account) {
			return void await ctx.reply(<NoAccountMessage />);
		}
		await ctx.reply(<AccountMessage provider={account.provider} username={account.username} />);
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
