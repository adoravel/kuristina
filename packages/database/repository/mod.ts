/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { MarkovRepository } from "./markov.ts";
import { TidalRepository } from "./tidal.ts";
import { ScrobbleAccountRepository } from "./scrobble.ts";

export const repositories = {
	markov: new MarkovRepository(),
	tidal: new TidalRepository(),
	scrobble: new ScrobbleAccountRepository(),
};
