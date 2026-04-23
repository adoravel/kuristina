/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { initialise } from "discord/bot";

if (import.meta.main) {
	const res = await initialise();

	if (!res.ok) {
		throw res.error;
	}
}
