/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { ComponentMessage, Container, Separator, TextDisplay, Theme } from "@kuristina/discord-ui";
import { md, type HeadingLevel } from "./markdown.tsx";

interface CardProps {
	children: any;
	color?: number | null;
	attachments?: any[];
	id?: number | undefined;
}

interface SectionProps {
	children: any;
	spacing?: 1 | 2;
}

interface HeadingProps {
	children: any;
	emoji?: string;
	level?: HeadingLevel;
}

interface SubtextProps {
	children: any;
}

interface LinkTextProps {
	children: any;
	url: string;
}

interface ListProps {
	items: string[];
	bullet?: string;
}

export function Card(
	{ children, color = Theme.colours.primary, attachments = [], id = undefined }: CardProps,
) {
	return (
		<ComponentMessage attachments={attachments}>
			<Container accentColor={color ?? undefined} id={id}>{children}</Container>
		</ComponentMessage>
	);
}

export function Section({ children, spacing = 2 }: SectionProps) {
	return (
		<>
			<Separator spacing={spacing} />
			{children}
		</>
	);
}

export function Heading({ children, emoji, level = 3 }: HeadingProps) {
	const text = emoji ? `${emoji} ${children}` : String(children);
	return <TextDisplay>{md.heading(text, level)}</TextDisplay>;
}

export function Subtext({ children }: SubtextProps) {
	return <TextDisplay>{md.subtext(String(children))}</TextDisplay>;
}

export function Link({ children, url }: LinkTextProps) {
	return <TextDisplay>{md.link(String(children), url)}</TextDisplay>;
}

export function List({ items, bullet = "-#" }: ListProps) {
	return <TextDisplay>{md.list(items, bullet)}</TextDisplay>;
}
