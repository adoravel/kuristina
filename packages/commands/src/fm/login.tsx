/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { defineCommand } from "@kuristina/commands/core";
import { flatMapAsync, mapAsync, waitForInteraction } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import { Theme } from "@kuristina/discord-ui";
import { getAuthToken, pollForSession } from "@kuristina/services/music/last.fm";
import { ackWithMessage, ButtonStyles, type Interaction } from "@kuristina/discord-bot";

const BUTTON_TIMEOUT_MS = 3 * 60_000;

function AuthMessage({ customId }: { customId: string }) {
	return (
		<message root>
			<div>
				<h3>
					<icon name="link" /> Link your Last.fm account
				</h3>
				<p>
					Press the button below to get the authorisation link, then come back. I'll pick it up for
					you automatically, sweetie~ &lt;3
				</p>
				<hr spacing={2} />
				<sub>This link expires in a few minutes.</sub>
			</div>
			<row>
				<button
					customId={customId}
					style={ButtonStyles.Secondary}
					emoji={Theme.emojiWithFallback("lastfm", { name: "🔗" })}
				>
					Connect Last.fm account
				</button>
			</row>
		</message>
	);
}

function AuthLinkMessage({ authUrl }: { authUrl: string }) {
	return (
		<message>
			<h3>
				<icon name="lastfm" /> Authorise Last.fm
			</h3>
			<p>
				<a href={authUrl}>Click here to authorise</a>
			</p>
			<hr spacing={2} />
			<sub>This is only visible for you.</sub>
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

export const login = defineCommand({
	aliases: "login",
	description: "Links your Last.fm account to the bot.",
	category: "lastfm",
	cooldownMs: 5000,
	async exec(ctx) {
		await ctx.defer();

		const tokenData = await ctx.resolve(getAuthToken());
		if (!tokenData) return;

		const { customId, promise } = waitForInteraction<Interaction>(
			"lastfm-login",
			BUTTON_TIMEOUT_MS,
			{
				filter: (i) => i.user?.id === ctx.user.id,
			},
		);

		await ctx.reply({ ...<AuthMessage customId={customId} /> });

		const clicked = await promise.catch(() => undefined);
		if (!clicked) {
			return;
		}

		const acked = await ackWithMessage(clicked, {
			...<AuthLinkMessage authUrl={tokenData.authUrl} />,
			ephemeral: true,
		}).then(() => true).catch((e) => {
			logger.warn("fm login: failed to send ephemeral auth link:", e);
			return false;
		});
		if (!acked) {
			return void await ctx.error("couldn't send you the auth link, try again?");
		}

		const linked = flatMapAsync(pollForSession(tokenData.token))((session) =>
			mapAsync<void, any>(
				repositories.scrobble.link(ctx.user.id, "last.fm", session.username, true),
			)(() => session.username)
		);

		const username = await ctx.resolve(linked);
		if (username) await ctx.reply({ ...<LinkedMessage username={username} /> });
	},
});

export const logout = defineCommand({
	aliases: "logout",
	description: "Unlinks your Last.fm account from the bot.",
	category: "lastfm",
	cooldownMs: 3000,
	async exec(ctx) {
		const unlink = repositories.scrobble.unlink(ctx.user.id, "last.fm");
		await mapAsync(unlink)(async () => void await ctx.reply(<UnlinkedMessage />));
	},
});

export const status = defineCommand({
	aliases: "status",
	description: "Shows your linked Last.fm account.",
	category: "lastfm",
	cooldownMs: 3000,
	async exec(ctx) {
		const current = await repositories.scrobble.getDefault(ctx.user.id);
		await mapAsync(Promise.resolve(current))(async (account) => {
			if (!account) return void await ctx.reply({ ...<NoAccountMessage /> });
			await ctx.reply(<AccountMessage provider={account.provider} username={account.username} />);
		});
	},
});
