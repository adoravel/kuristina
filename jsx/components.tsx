/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Separator } from "~jsx/Separator.tsx";
import { ComponentMessage } from "~jsx/ComponentMessage.tsx";
import { Container } from "~jsx/Container.tsx";
import { TextDisplay } from "~jsx/TextDisplay.tsx";
import { getConfig } from "~/config/mod.ts";

export const Theme = {
	colors: {
		primary: 0x5865f2,
		success: 0x57f287,
		warning: 0xfee75c,
		danger: 0xed4245,
		info: 0x5865f2,
		purple: 0xcdadff,
		pink: 0xeb459e,
		neutral: 0x99aab5,
	},
} as const;

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
	{ children, color = Theme.colors.primary, attachments = [], id = undefined }: CardProps,
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
	const emojiPrefix = emoji ? `${emoji} ` : "";

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
	emoji = getConfig().emojis.success,
	color = Theme.colors.info,
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
	emoji = getConfig().emojis.error,
}: ErrorMessageProps) {
	return (
		<Card color={Theme.colors.danger}>
			<Heading emoji={emoji}>{title}</Heading>
			<Separator spacing={2} />
			<TextDisplay>{children}</TextDisplay>
			{suggestion && (
				<Section spacing={2}>
					<TextDisplay>{getConfig().emojis.error} {suggestion}</TextDisplay>
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
		<Card color={Theme.colors.success}>
			<Heading emoji={getConfig().emojis.success}>{title}</Heading>
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
