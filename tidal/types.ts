/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface Artist {
	id: number;
	name: string;
	popularity?: number;
	url: string;
	artistTypes?: string[];
	type?: string;
}

export interface TidalAlbumStub {
	id: number;
	title: string;
	cover?: string;
	releaseDate?: string;
	streamStartDate?: string;
	numberOfTracks?: number;
	numberOfVolumes?: number;
	audioQuality?: string;
	mediaMetadata?: { tags?: string[] };
	upc?: string;
	copyright?: string;
	albumType?: string;
	artist?: Artist;
	artists?: Artist[];
}

export interface Track {
	id: number;
	title: string;
	duration: number;
	trackNumber?: number;
	volumeNumber?: number;
	version?: string;
	isrc?: string;
	url?: string;
	explicit: boolean;
	popularity?: number;
	audioQuality?: string;
	audioModes?: string[];
	replayGain?: number;
	peak?: number;
	streamReady?: boolean;
	streamStartDate?: string;
	bpm?: number;
	copyright?: string;
	artist?: Artist;
	artists: Artist[];
	album?: TidalAlbumStub;
	mediaMetadata?: { tags?: string[] };
}

export interface TidalAlbum extends TidalAlbumStub {
	artists: Artist[];
}

export interface TracksPage<T> {
	limit: number;
	offset: number;
	totalNumberOfItems: number;
	items: T[];
}

export interface TidalPlaylist {
	uuid: string;
	title: string;
	numberOfTracks?: number;
	description?: string;
	creator?: { id?: number; name?: string };
	image?: string;
	squareImage?: string;
}

export interface PlaylistTrackItem {
	cut?: unknown;
	item: Track;
	type: "track";
}

export interface TidalLyrics {
	trackId: number;
	lyricsProvider?: string;
	providerCommontrackId?: string;
	providerLyricsId?: string;
	lyrics?: string;
	subtitles?: string;
	isRightToLeft?: boolean;
}

export type ManifestMimeType =
	| "application/vnd.tidal.bts"
	| "application/dash+xml";

export interface PlaybackInfoResponse {
	trackId: number;
	assetPresentation: string;
	audioMode: string;
	audioQuality: string;
	streamingSessionId: string;
	manifestMimeType: ManifestMimeType;
	manifest: string;
	sampleRate?: number;
	bitDepth?: number;
	codec?: string;
}

export interface BtsManifest {
	mimeType: string;
	codecs: string;
	encryptionType: string;
	urls: string[];
	sampleRate?: number;
	bitDepth?: number;
}

export interface ResolvedStream {
	urls: string[];
	mimeType: string;
	codecs: string;
	sampleRate?: number;
	bitDepth?: number;
	audioQuality: string;
}

export interface Credit {
	type: string;
	contributors: Array<{ name: string; id?: number; role?: string }>;
}

export interface TrackCredits {
	item: Track;
	type?: string;
	credits: Credit[];
}

export interface AlbumCredits {
	items: Credit[];
}
