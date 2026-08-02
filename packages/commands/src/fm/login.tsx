/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand } from "@kuristina/commands/registry";
import { flatMapAsync, mapAsync } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import { Theme } from "@kuristina/discord-ui";
import { getAuthToken, type LastFmSession, pollForSession } from "@kuristina/services/lastfm";

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

export function NoAccountMessage() {
	return (
		<message>
			<h3>
				<icon name="link" /> No account linked
			</h3>
			<p>
				Run <kbd>{Theme.prefix}fm login</kbd> to get started.
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

export const login = defineCommand("login", {}, async (ctx) => {
	const result = flatMapAsync(getAuthToken())(async ({ token, authUrl }) => {
		await ctx.reply(<AuthMessage authUrl={authUrl} />);
		return await pollForSession(token);
	});
	await flatMapAsync<LastFmSession, unknown>(result)(({ username }) => {
		const link = repositories.scrobble.link(ctx.user.id, "last.fm", username, true);
		return mapAsync(link)(async () => void await ctx.reply(<LinkedMessage username={username} />));
	});
}, {
	description: "Links your Last.fm account to the bot.",
	category: "lastfm",
	cooldownMs: 5000,
});

export const logout = defineCommand("logout", {}, async (ctx) => {
	const unlink = repositories.scrobble.unlink(ctx.user.id, "last.fm");
	await mapAsync(unlink)(async () => void await ctx.reply(<UnlinkedMessage />));
}, {
	description: "Unlinks your Last.fm account from the bot.",
	category: "lastfm",
	cooldownMs: 3000,
});

export const status = defineCommand("status", {}, async (ctx) => {
	const current = repositories.scrobble.getDefault(ctx.user.id);
	await mapAsync(current)(async (account) => {
		if (!account) {
			return void await ctx.reply(<NoAccountMessage />);
		}
		await ctx.reply(<AccountMessage provider={account.provider} username={account.username} />);
	});
}, {
	description: "Shows your linked Last.fm account.",
	category: "lastfm",
	cooldownMs: 3000,
});
