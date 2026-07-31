/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import {
	ComponentMessage,
	Container,
	Separator,
	Theme,
} from "@kuristina/discord-ui";

interface CardProps {
	children: any;
	color?: number | null;
	attachments?: any[];
	id?: number | undefined;
}

export interface SectionProps {
	children: any;
	spacing?: 1 | 2;
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

