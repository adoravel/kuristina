/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-2.0-or-later
 */

import { initialise, shutdown } from "~/discord/bot";
import { initialiseClient } from "~/discord/client.ts";

if (import.meta.main) {
	const res = await initialise();
	if (!res.ok) throw res.error;

	const client = initialiseClient();
	if (client) await client.start();

	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		Deno.addSignalListener(signal, async () => {
			console.log(`\nreceived ${signal}, shutting down...`);
			await shutdown();
			await client?.shutdown();
			Deno.exit(0);
		});
	}
}
