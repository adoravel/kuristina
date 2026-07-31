/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { Separator } from "@kuristina/discord-ui";

export interface SectionProps {
	children: any;
	spacing?: 1 | 2;
}

export function Section({ children, spacing = 2 }: SectionProps) {
	return (
		<>
			<Separator spacing={spacing} />
			{children}
		</>
	);
}
