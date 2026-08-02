/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { ok, type Result } from "@kuristina/core";
import { type SqlError, tryQuery } from "@kuristina/database";
import { Repository } from "./helper.ts";

export type CompanionKind = "command" | "richlink";

export interface MessageCompanion {
	responseMessageId: bigint;
	channelId: bigint;
	kind: CompanionKind;
}

export class MessageCompanionRepository extends Repository {
	async add(
		sourceId: bigint,
		responseId: bigint,
		channelId: bigint,
		kind: CompanionKind,
	): Promise<Result<void, SqlError>> {
		return await tryQuery(() =>
			this.database.insertInto("message_companions")
				.values({
					source_message_id: sourceId.toString(),
					response_message_id: responseId.toString(),
					channel_id: channelId.toString(),
					kind,
					created_at: Math.floor(Date.now() / 1000),
				})
				.onConflict((oc) => oc.columns(["source_message_id", "response_message_id"]).doNothing())
				.execute()
		).then((r) => (r.ok ? ok(undefined) : r));
	}

	async getForSource(
		sourceId: bigint,
		kind?: CompanionKind,
	): Promise<Result<MessageCompanion[], SqlError>> {
		return await tryQuery(async () => {
			let query = this.database.selectFrom("message_companions")
				.select(["response_message_id", "channel_id", "kind"])
				.where("source_message_id", "=", sourceId.toString());
			if (kind) query = query.where("kind", "=", kind);

			const rows = await query.execute();
			return rows.map((r) => ({
				responseMessageId: BigInt(r.response_message_id),
				channelId: BigInt(r.channel_id),
				kind: r.kind as CompanionKind,
			}));
		});
	}

	async deleteForSource(sourceId: bigint, kind?: CompanionKind): Promise<Result<void, SqlError>> {
		return await tryQuery(async () => {
			let query = this.database.deleteFrom("message_companions")
				.where("source_message_id", "=", sourceId.toString());
			if (kind) query = query.where("kind", "=", kind);
			await query.execute();
		}).then((r) => (r.ok ? ok(undefined) : r));
	}
}
