/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { arg, defineCommand, ownerOnly } from "@kuristina/commands/core";
import type { Invocation } from "@kuristina/commands/core";
import { cancelWaiter, waitForInteraction } from "@kuristina/core";
import {
	assertEditableTable,
	countRows,
	DEFAULT_TIMEOUT_MS,
	fetchRows,
	MAX_PAGE_SIZE,
	validateAndGetSchema,
} from "@kuristina/database/admin";
import { ButtonStyles, type Interaction } from "@kuristina/discord-bot";

const formatRows = (
	rows: Record<string, unknown>[],
	columns: string[],
): string => {
	const safe = rows.map((r) =>
		Object.fromEntries(
			Object.entries(r)
				.filter(([k]) => columns.includes(k))
				.map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]),
		)
	);
	const body = JSON.stringify(safe, null, 2);
	return body.length > 1700 ? body.slice(0, 1697) + "..." : body;
};

const renderPage = async (
	table: string,
	page: number,
	pageSize: number,
): Promise<{ content: string; totalPages: number; total: number }> => {
	const [total, rows, schema] = await Promise.all([
		countRows(table),
		fetchRows(table, { limit: pageSize, offset: page * pageSize }),
		validateAndGetSchema(table),
	]);

	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const columns = schema.columns.map((c) => c.name);

	return {
		content: `**${table}:** page ${page + 1}/${totalPages} (${total} rows)\n\`\`\`json\n${
			rows.length ? formatRows(rows, columns) : "(no rows)"
		}\n\`\`\``,
		totalPages,
		total,
	};
};

const runInspector = async (
	ctx: Invocation,
	table: string,
	pageSize = MAX_PAGE_SIZE,
): Promise<void> => {
	let page = 0;
	let messageId: bigint | undefined;

	while (true) {
		const { content, totalPages } = await renderPage(table, page, pageSize);

		const { customId: prevId, promise: prevP } = waitForInteraction<Interaction>(
			"db-prev",
			DEFAULT_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);
		const { customId: nextId, promise: nextP } = waitForInteraction<Interaction>(
			"db-next",
			DEFAULT_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);
		const { customId: closeId, promise: closeP } = waitForInteraction<Interaction>(
			"db-close",
			DEFAULT_TIMEOUT_MS,
			{ filter: (i) => i.user?.id === ctx.user.id },
		);

		const components = (
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
				<button customId={closeId} style={ButtonStyles.Danger}>✕ Close</button>
			</row>
		);

		if (messageId) {
			await ctx.platform.helpers.editMessage(ctx.channelId, messageId, {
				content,
				components: [components],
			});
		} else {
			const sent = await ctx.reply({ content, components: [components] }, { ephemeral: true });
			if (sent) messageId = sent.id;
		}

		const winner = await Promise.race([
			prevP.then(() => "prev" as const),
			nextP.then(() => "next" as const),
			closeP.then(() => "close" as const),
		]).catch(() => "timeout" as const);

		cancelWaiter(prevId);
		cancelWaiter(nextId);
		cancelWaiter(closeId);

		if (winner === "prev") {
			page = Math.max(0, page - 1);
		} else if (winner === "next") {
			page = Math.min(totalPages - 1, page + 1);
		} else {
			await ctx.reply({
				content: winner === "close" ? "closed" : "inspector timed out",
			}, { ephemeral: true });
			return;
		}
	}
};

export default defineCommand({
	aliases: ["inspect", "browse"],
	description: "Browses rows in an admin-editable table, paginated.",
	args: { table: arg.string({ description: "table name", required: true }) },
	async exec(ctx) {
		try {
			assertEditableTable(ctx.args.table);
			await runInspector(ctx, ctx.args.table);
		} catch (e: any) {
			await ctx.error("message" in e ? e.message : String(e));
		}
	},
	middleware: [ownerOnly],
});
