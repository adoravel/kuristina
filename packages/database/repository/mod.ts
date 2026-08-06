/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { MarkovRepository } from "./markov.ts";
import { ScrobbleAccountRepository } from "./scrobble.ts";
import { IconRepository } from "./icon.ts";
import { StateRepository } from "./state.ts";
import { GuildMemberRepository } from "./members.ts";
import { MusicLinkRepository } from "./musiclinks.ts";
import { MessageCompanionRepository } from "./message_companions.ts";
import { GuildProfileRepository } from "./guild_profile.ts";
import { ArtistAliasRepository } from "./artist_alias.ts";
import { LastFmCacheRepository } from "./lastfm_cache.ts";

export const repositories = {
	markov: new MarkovRepository(),
	scrobble: new ScrobbleAccountRepository(),
	icon: new IconRepository(),
	state: new StateRepository(),
	members: new GuildMemberRepository(),
	musicLinks: new MusicLinkRepository(),
	messageCompanions: new MessageCompanionRepository(),
	guildProfile: new GuildProfileRepository(),
	artistAliases: new ArtistAliasRepository(),
	lastfmCache: new LastFmCacheRepository(),
};

export {
	type CompanionKind,
	isRichLinkKind,
	type MessageCompanion,
	type RichLinkProvider,
} from "./message_companions.ts";
export * from "./restart_state.ts";
