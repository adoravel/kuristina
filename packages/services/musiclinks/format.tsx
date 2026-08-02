/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { md, Theme } from "@kuristina/discord-ui";
import { type MusicLinkResult, PLATFORM_LABELS } from "./types.ts";

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

export function renderMusicLinkCard(result: MusicLinkResult) {
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
				<ul>
					{Object.entries(result.links).map(([platform, url]) => {
						const { label, icon } = getPlatformDisplay(platform);
						return (
							<li>
								{icon}
								<a href={url}>{label} ↗</a>
							</li>
						);
					})}
				</ul>
			</section>
		</message>
	);
}
