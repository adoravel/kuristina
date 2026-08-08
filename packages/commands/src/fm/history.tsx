import { arg, defineCommand } from "@kuristina/commands/core";
import type { Invocation } from "@kuristina/commands/core";
import { cancelWaiter, waitForInteraction } from "@kuristina/core";
import { repositories } from "@kuristina/database";
import {
	getHighestQualityImage,
	getRecentTracks,
	type LastFmTrack,
} from "@kuristina/services/music/last.fm";
import { ackDeferUpdate } from "@kuristina/discord-bot";
import { ButtonStyles, type CreateMessageOptions, type Interaction } from "@kuristina/discord-bot";
import { NoAccountMessage } from "./login.tsx";
import { PROVIDER } from "./helper.ts";

const HISTORY_TIMEOUT_MS = 120_000;
const PAGE_SIZE = 7;

async function renderHistoryPage(username: string, page: number): Promise<CreateMessageOptions> {
	const recent = await getRecentTracks(username, { limit: PAGE_SIZE, page: page + 1 });
	if (!recent.ok || !recent.value.track.length) {
		return <EmptyHistoryPage page={page} />;
	}
	return <HistoryPage tracks={recent.value.track} page={page} />;
}

async function runHistoryBrowser(ctx: Invocation, username: string): Promise<void> {
	let page = 0;

	while (true) {
		const message = await renderHistoryPage(username, page);

		const { customId: prevId, promise: prevP } = waitForInteraction<Interaction>(
			"fmhistory-prev",
			HISTORY_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);
		const { customId: nextId, promise: nextP } = waitForInteraction<Interaction>(
			"fmhistory-next",
			HISTORY_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);
		const { customId: closeId, promise: closeP } = waitForInteraction<Interaction>(
			"fmhistory-close",
			HISTORY_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);

		message.components?.push(
			<row>
				<button customId={prevId} style={ButtonStyles.Secondary} disabled={page === 0}>
					← Prev
				</button>
				<button customId={nextId} style={ButtonStyles.Secondary}>Next →</button>
				<button customId={closeId} style={ButtonStyles.Danger}>✕</button>
			</row>,
		);
		await ctx.reply(message);

		const winner = await Promise.race([
			prevP.then((i) => ({ kind: "prev" as const, interaction: i })),
			nextP.then((i) => ({ kind: "next" as const, interaction: i })),
			closeP.then((i) => ({ kind: "close" as const, interaction: i })),
		]).catch(() => ({ kind: "timeout" as const, interaction: undefined }));

		cancelWaiter(prevId);
		cancelWaiter(nextId);
		cancelWaiter(closeId);

		if (winner.interaction) await ackDeferUpdate(winner.interaction).catch(() => {});

		if (winner.kind === "prev") page = Math.max(0, page - 1);
		else if (winner.kind === "next") page += 1;
		else return;
	}
}
function EmptyHistoryPage({ page }: { page: number }) {
	return (
		<message>
			<h3>
				<icon name="clock" /> Nothing here
			</h3>
			<p>No scrobbles on page {page + 1}.</p>
		</message>
	);
}

function HistoryPage({ tracks, page }: { tracks: LastFmTrack[]; page: number }) {
	const image = getHighestQualityImage(tracks[0].image);

	return (
		<message>
			<section>
				<accessory>
					<thumbnail url={image["#text"]} description={tracks[0].name} />
				</accessory>
				<h3>
					<icon name="clock" />
					{`  Recent scrobbles · `}
					page {page + 1}
				</h3>
				<ol>
					{tracks.map((t) => {
						const live = t["@attr"]?.nowplaying === "true";
						return (
							<li>
								{live && (
									<>
										<icon name="music" />
										{" "}
									</>
								)}
								<strong>{t.name}</strong>
								{" by "}
								{t.artist["#text"] ?? t.artist.name}
								<br />
								<sub>{live ? "now playing" : t.date?.uts ? `<t:${t.date.uts}:R>` : ""}</sub>
							</li>
						);
					})}
				</ol>
			</section>
			<hr spacing={2} />
			<sub>{PROVIDER}</sub>
		</message>
	);
}

export default defineCommand({
	aliases: "history",
	description: "Shows your (or someone's) recent Last.fm scrobbles.",
	category: "fm",
	cooldownMs: 3_000,
	args: { user: arg.user({ description: "whose history to show", required: false }) },
	async exec(ctx) {
		const userId = ctx.args.user ?? ctx.user.id;

		const account = await ctx.resolve(repositories.scrobble.getDefault(userId));
		if (account === undefined) return;

		if (!account) return void await ctx.reply({ ...<NoAccountMessage /> });

		await runHistoryBrowser(ctx, account.username);
	},
});
