/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { Kysely } from "@kysely/kysely";
import { database, type KuristinaSchema } from "@kuristina/database";

export abstract class Repository {
	protected get database(): Kysely<KuristinaSchema> {
		return database;
	}
}
