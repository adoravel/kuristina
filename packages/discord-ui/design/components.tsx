/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { ComponentMessage, Container, Separator, TextDisplay, Theme } from "@kuristina/discord-ui";

interface ListProps {
	items: string[];
	bullet?: string;
}

interface SectionProps {
	children: any;
	spacing?: 1 | 2;
}

interface CardProps {
	children: any;
	color?: number;
	attachments?: any[];
	id?: number | undefined;
}

interface HeadingProps {
	children: any;
	emoji?: string;
	level?: 1 | 2 | 3;
}

interface InfoMessageProps {
	title: string;
	children: any;
	emoji?: string;
	color?: number;
	footer?: any;
}

interface SubtextProps {
	children: any;
}

interface LinkTextProps {
	children: any;
	url: string;
}

interface ErrorMessageProps {
	title?: string;
	children: any;
	emoji?: string;
	suggestion?: string;
}

interface SuccessMessageProps {
	title?: string;
	children: any;
}

export function Card(
	{ children, color = Theme.colours.primary, attachments = [], id = undefined }: CardProps,
) {
	return (
		<ComponentMessage attachments={attachments}>
			<Container accentColor={color} id={id}>
				{children}
			</Container>
		</ComponentMessage>
	);
}

export function Section(
	{ children, spacing = 2 }: SectionProps,
) {
	return (
		<>
			<Separator spacing={spacing} />
			{children}
		</>
	);
}

export function Heading({ children, emoji, level = 3 }: HeadingProps) {
	const prefix = "#".repeat(level);
	const emojiPrefix = emoji ? `${emoji} ` : "";

	return (
		<TextDisplay>
			{`${prefix} ${emojiPrefix}${children}`}
		</TextDisplay>
	);
}

export function Subtext({ children }: SubtextProps) {
	return (
		<TextDisplay>
			-# {children}
		</TextDisplay>
	);
}

export function Link({ children, url }: LinkTextProps) {
	return (
		<TextDisplay>
			[{children}]({url})
		</TextDisplay>
	);
}

export function InfoMessage({
	title,
	children,
	emoji = Theme.emoji.success,
	color = Theme.colours.info,
	footer,
}: InfoMessageProps) {
	return (
		<Card color={color}>
			<Heading emoji={emoji}>{title}</Heading>
			<Separator spacing={2} />
			<TextDisplay>{children}</TextDisplay>
			{footer && (
				<Section spacing={2}>
					<Subtext>{footer}</Subtext>
				</Section>
			)}
		</Card>
	);
}

export function ErrorMessage({
	title = "An error occurred",
	children,
	suggestion,
	emoji = Theme.emoji.error,
}: ErrorMessageProps) {
	return (
		<Card color={Theme.colours.danger}>
			<Heading emoji={emoji}>{title}</Heading>
			<Separator spacing={2} />
			<TextDisplay>{children}</TextDisplay>
			{suggestion && (
				<Section spacing={2}>
					<TextDisplay>{Theme.emoji.error} {suggestion}</TextDisplay>
				</Section>
			)}
		</Card>
	);
}

export function SuccessMessage({
	title = "yippe!!!!11!1",
	children,
}: SuccessMessageProps) {
	return (
		<Card color={Theme.colours.success}>
			<Heading emoji={Theme.emoji.success}>{title}</Heading>
			<Separator spacing={2} />
			<TextDisplay>{children}</TextDisplay>
		</Card>
	);
}

export function List({ items, bullet = "-#" }: ListProps) {
	return (
		<TextDisplay>
			{items.map((item) => `${bullet} ${item}`).join("\n")}
		</TextDisplay>
	);
}
