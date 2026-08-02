/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { MarkovRepository } from "./markov.ts";
import { TidalRepository } from "./tidal.ts";
import { ScrobbleAccountRepository } from "./scrobble.ts";
import { IconRepository } from "./icon.ts";
import { StateRepository } from "./state.ts";
import { GuildMemberRepository } from "./members.ts";
import { MusicLinkRepository } from "./music_links.ts";
import { MessageCompanionRepository } from "./message_companions.ts";

export const repositories = {
	markov: new MarkovRepository(),
	tidal: new TidalRepository(),
	scrobble: new ScrobbleAccountRepository(),
	icon: new IconRepository(),
	state: new StateRepository(),
	members: new GuildMemberRepository(),
	musicLinks: new MusicLinkRepository(),
	messageCompanions: new MessageCompanionRepository(),
};

export { type CompanionKind } from "./message_companions.ts";
