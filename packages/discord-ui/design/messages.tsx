/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { Theme } from "./theme.ts";

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

export function ErrorMessage({
	title = "An error occurred",
	children,
	suggestion,
	emoji = Theme.emoji.error,
}: ErrorMessageProps) {
	return (
		<message>
			<h3>{emoji} {title}</h3>
			<hr spacing={2} />
			<p>{children}</p>
			{suggestion && (
				<section spacing={2}>
					<p>{Theme.emoji.error} {suggestion}</p>
				</section>
			)}
		</message>
	);
}

export function SuccessMessage({ title = "yippe!!!!11!1", children }: SuccessMessageProps) {
	return (
		<message>
			<h3>{Theme.emoji.success} {title}</h3>
			<hr spacing={2} />
			<p>{children}</p>
		</message>
	);
}
