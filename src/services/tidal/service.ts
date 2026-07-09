/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { TidalError } from "~/services/tidal/errors.ts";
import { Result } from "~/lib/result.ts";

export type TidalResult<T> = Result<T, TidalError>;

export interface TidalServiceConfig {
	readonly clientId?: string;
	readonly clientSecret?: string;
}
