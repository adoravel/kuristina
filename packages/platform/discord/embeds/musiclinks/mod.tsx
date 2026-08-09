/**
 * kuristina, a bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { md, Theme } from "@kuristina/discord-ui";
import { type MusicLinkResult, PLATFORM_LABELS } from "@kuristina/services/music/links";
import type { MusicMetadata } from "@kuristina/services/music/metadata";

function truncate(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function renderPlatformLinks(result: MusicLinkResult): string[] {
	return Object.entries(result.links).map(([platform, url]) => {
		const { label, icon } = getPlatformDisplay(platform);
		return `${icon} ${md.link(label, url)}`;
	});
}

function getPlatformDisplay(platform: string) {
	const label = PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ?? platform;
	const icon = Theme.icon(platform as any) ?? Theme.icon("link");
	return { label, icon };
}

function MusicThumbnail({ thumbnailUrl, title }: { thumbnailUrl?: string; title: string }) {
	if (!thumbnailUrl) return null;
	return (
		<accessory>
			<thumbnail url={thumbnailUrl} description={title} />
		</accessory>
	);
}

function MusicHeader({ title, artist }: { title: string; artist?: string }) {
	return (
		<h3>
			<icon name="music" />
			{`  `}
			{title}
			{artist ? ` by ${artist}` : ""}
		</h3>
	);
}

function MusicDescription({ description }: { description?: string }) {
	if (!description) return null;
	return <p>{truncate(description, 350)}</p>;
}

function MusicReleaseDate({ releaseDate }: { releaseDate?: string }) {
	if (!releaseDate) return null;
	return (
		<>
			<sub>
				<icon name="calendar" />
				{`  `}Released on {releaseDate}
			</sub>
			<br />
		</>
	);
}

function PlatformLinksList({ links }: { links: Record<string, string> }) {
	return (
		<ul>
			{Object.entries(links).map(([platform, url]) => {
				const { label, icon } = getPlatformDisplay(platform);
				return (
					<li>
						{icon}
						{`  `}
						<a href={url}>{label}</a>
					</li>
				);
			})}
		</ul>
	);
}

export function renderMusicLinkCard(result: MusicLinkResult, metadata?: MusicMetadata) {
	return (
		<message>
			<section>
				<MusicThumbnail thumbnailUrl={result.thumbnailUrl} title={result.title} />
				<MusicHeader title={result.title} artist={result.artist} />
				<MusicDescription description={metadata?.description} />
				<MusicReleaseDate releaseDate={metadata?.releaseDate} />
				<PlatformLinksList links={result.links} />
			</section>
		</message>
	);
}
