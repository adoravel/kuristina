/**
 * kuristina, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 adoravel
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { initialise, shutdown } from "~/discord/bot";

if (import.meta.main) {
	const res = await initialise();

	if (!res.ok) {
		throw res.error;
	}

	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		Deno.addSignalListener(signal, async () => {
			console.log(`\nreceived ${signal}, shutting down...`);
			await shutdown();
			Deno.exit(0);
		});
	}
}
