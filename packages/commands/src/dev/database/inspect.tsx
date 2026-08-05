/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand, ownerOnly } from "@kuristina/commands/core";
import type { Invocation } from "@kuristina/commands/core";
import { cancelWaiter, waitForInteraction } from "@kuristina/core";
import { assertEditable, countRows, fetchRows } from "@kuristina/database/admin";
import { ButtonStyles, type Interaction } from "@kuristina/discord-bot";

const PAGE_SIZE = 10;

function formatRows(rows: Record<string, unknown>[]): string {
	const safe = rows.map((r) =>
		Object.fromEntries(
			Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]),
		)
	);
	const body = JSON.stringify(safe, null, 2);
	return body.length > 1700 ? body.slice(0, 1697) + "..." : body;
}

async function renderPage(table: string, page: number) {
	const [total, rows] = await Promise.all([
		countRows(table),
		fetchRows(table, { limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
	]);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	return {
		content: `**${table}** — page ${page + 1}/${totalPages} (${total} rows)\n\`\`\`json\n${
			rows.length ? formatRows(rows) : "(no rows)"
		}\n\`\`\``,
		totalPages,
	};
}

async function runInspector(ctx: Invocation, table: string): Promise<void> {
	let page = 0;

	while (true) {
		const { content, totalPages } = await renderPage(table, page);

		const { customId: prevId, promise: prevP } = waitForInteraction<Interaction>(
			"db-prev",
			120_000,
			{
				filter: (i) => i.user?.id === ctx.user.id,
			},
		);
		const { customId: nextId, promise: nextP } = waitForInteraction<Interaction>(
			"db-next",
			120_000,
			{
				filter: (i) => i.user?.id === ctx.user.id,
			},
		);
		const { customId: closeId, promise: closeP } = waitForInteraction<Interaction>(
			"db-close",
			120_000,
			{
				filter: (i) => i.user?.id === ctx.user.id,
			},
		);

		await ctx.reply({
			content,
			components: [
				<row>
					<button customId={prevId} style={ButtonStyles.Secondary} disabled={page === 0}>
						← Prev
					</button>
					<button
						customId={nextId}
						style={ButtonStyles.Secondary}
						disabled={page >= totalPages - 1}
					>
						Next →
					</button>
					<button customId={closeId} style={ButtonStyles.Danger}>Close</button>
				</row>,
			],
		}, { ephemeral: true });

		const winner = await Promise.race([
			prevP.then(() => "prev" as const),
			nextP.then(() => "next" as const),
			closeP.then(() => "close" as const),
		]).catch(() => "timeout" as const);

		cancelWaiter(prevId);
		cancelWaiter(nextId);
		cancelWaiter(closeId);

		if (winner === "prev") page = Math.max(0, page - 1);
		else if (winner === "next") page += 1;
		else {
			await ctx.reply({ content: winner === "close" ? "closed" : "inspector timed out" }, {
				ephemeral: true,
			});
			return;
		}
	}
}

export default defineCommand({
	aliases: ["inspect", "browse"],
	description: "Browses rows in an admin-editable table, paginated.",
	args: { table: arg.string({ description: "table name", required: true }) },
	async exec(ctx) {
		try {
			assertEditable(ctx.args.table);
		} catch (e) {
			return void await ctx.error((e as Error).message);
		}
		await runInspector(ctx, ctx.args.table);
	},
	middleware: [ownerOnly],
});
