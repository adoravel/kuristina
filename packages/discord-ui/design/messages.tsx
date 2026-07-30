/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { Separator, TextDisplay } from "@kuristina/discord-ui";
import { Card, Heading, Section, Subtext } from "./primitives.tsx";
import { Theme } from "./theme.ts";

interface InfoMessageProps {
	title: string;
	children: any;
	emoji?: string;
	color?: number;
	footer?: any;
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

export function SuccessMessage({ title = "yippe!!!!11!1", children }: SuccessMessageProps) {
	return (
		<Card color={Theme.colours.success}>
			<Heading emoji={Theme.emoji.success}>{title}</Heading>
			<Separator spacing={2} />
			<TextDisplay>{children}</TextDisplay>
		</Card>
	);
}
