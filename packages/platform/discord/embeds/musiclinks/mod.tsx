/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
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
	return Object.entries(result.links)
		.map(([platform, url]) => {
			const { label, icon } = getPlatformDisplay(platform);
			return `${icon} ${md.link(label, url)}`;
		});
}

function getPlatformDisplay(platform: string) {
	const label = PLATFORM_LABELS[platform as keyof typeof PLATFORM_LABELS] ?? platform;
	const icon = Theme.icon(platform as any) ?? Theme.icon("link");
	return { label, icon };
}

export function renderMusicLinkCard(result: MusicLinkResult, metadata?: MusicMetadata) {
	return (
		<message>
			<section>
				{result.thumbnailUrl && (
					<accessory>
						<thumbnail url={result.thumbnailUrl} description={result.title} />
					</accessory>
				)}
				<h3>
					<icon name="music" />
					{`  `}
					{result.title}
					{result.artist ? ` by ${result.artist}` : ""}
				</h3>
				{metadata?.description && <p>{truncate(metadata.description, 350)}</p>}
				{metadata?.releaseDate && (
					<>
						<sub>
							<icon name="calendar" /> Released on {metadata.releaseDate}
						</sub>
						<br />
					</>
				)}
				<ul>
					{Object.entries(result.links).map(([platform, url]) => {
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
			</section>
		</message>
	);
}
