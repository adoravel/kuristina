/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";

export type RichLinkProvider = "github" | "forgejo" | "twitter" | "fediverse" | "musiclinks";

export type CompanionKind = "command" | `richlink:${RichLinkProvider}`;

export interface MessageCompanion {
	responseMessageId: bigint;
	channelId: bigint;
	kind: CompanionKind;
	sourceUrl: string | null;
}

export const isRichLinkKind = (kind: string): boolean => kind.startsWith("richlink:");

function toCompanion(
	row: { response_message_id: string; channel_id: string; kind: string; source_url: string | null },
): MessageCompanion {
	return {
		responseMessageId: BigInt(row.response_message_id),
		channelId: BigInt(row.channel_id),
		kind: row.kind as CompanionKind,
		sourceUrl: row.source_url,
	};
}

export class MessageCompanionRepository extends Repository {
	async add(
		sourceId: bigint,
		responseId: bigint,
		channelId: bigint,
		kind: CompanionKind,
		sourceUrl?: string,
	): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("message_companions")
				.values({
					source_message_id: sourceId.toString(),
					response_message_id: responseId.toString(),
					channel_id: channelId.toString(),
					kind,
					created_at: Math.floor(Date.now() / 1000),
					source_url: sourceUrl ?? null,
				})
				.onConflict((oc) => oc.column("response_message_id").doNothing())
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async getForSource(
		sourceId: bigint,
		kind?: CompanionKind,
	): Promise<Result<MessageCompanion[], SqlError>> {
		return await tryQuery(async () => {
			let query = this.database.selectFrom("message_companions")
				.select(["response_message_id", "channel_id", "kind", "source_url"])
				.where("source_message_id", "=", sourceId.toString());
			if (kind) query = query.where("kind", "=", kind);

			const rows = await query.execute();
			return rows.map(toCompanion);
		});
	}

	async getForSourceByPrefix(
		sourceId: bigint,
		kindPrefix: string,
	): Promise<Result<MessageCompanion[], SqlError>> {
		return await tryQuery(async () => {
			const rows = await this.database.selectFrom("message_companions")
				.select(["response_message_id", "channel_id", "kind", "source_url"])
				.where("source_message_id", "=", sourceId.toString())
				.where("kind", "like", `${kindPrefix}%`)
				.execute();
			return rows.map(toCompanion);
		});
	}

	async deleteResponses(
		sourceId: bigint,
		responseIds: bigint[],
	): Promise<Result<void, SqlError>> {
		if (!responseIds.length) return ok(undefined);
		return await tryQuery(() =>
			this.database.deleteFrom("message_companions")
				.where("source_message_id", "=", sourceId.toString())
				.where("response_message_id", "in", responseIds.map(($) => $.toString()))
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async deleteForSource(sourceId: bigint, kind?: CompanionKind): Promise<Result<void, SqlError>> {
		return await tryQuery(async () => {
			let query = this.database.deleteFrom("message_companions")
				.where("source_message_id", "=", sourceId.toString());
			if (kind) query = query.where("kind", "=", kind);
			await query.execute();
		}).then((r) => (r.ok ? ok(undefined) : r));
	}

	async purgeOlderThan(retentionSeconds: number): Promise<Result<number, SqlError>> {
		return await tryQuery(async () => {
			const cutoff = Math.floor(Date.now() / 1000) - retentionSeconds;
			const result = await this.database.deleteFrom("message_companions")
				.where("created_at", "<", cutoff).executeTakeFirst();
			return Number(result.numDeletedRows ?? 0n);
		});
	}
}
