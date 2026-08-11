/**
 * kuristina, a ~~kitchen~~ bathroom sink discord bot
 * Copyright (c) 2025-2026 kyu.re
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { initialise, shutdown } from "@kuristina/discord-bot";
import { initialiseClient } from "@kuristina/discord-client";

if (import.meta.main) {
	const client = initialiseClient();
	let shuttingDown = false;

	const onShutdown = (signal: string) => async () => {
		if (shuttingDown) return;
		shuttingDown = true;

		logger.info(`received ${signal}, shutting down...`);
		await shutdown();
		await client?.shutdown();

		Deno.exit(0);
	};

	Deno.addSignalListener("SIGINT", onShutdown("SIGINT"));
	Deno.addSignalListener("SIGTERM", onShutdown("SIGTERM"));

	const res = await initialise();
	if (!res.ok) throw res.error;

	if (client) await client.start();
}
