/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { TidalError } from "~/tidal/errors.ts";
import { Result } from "~/lib/result.ts";

export type TidalResult<T> = Result<T, TidalError>;

export interface TidalServiceConfig {
	readonly clientId?: string;
	readonly clientSecret?: string;
}
