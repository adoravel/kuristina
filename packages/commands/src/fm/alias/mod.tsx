import { defineCommand } from "@kuristina/commands/core";
import add from "./add.tsx";
import remove from "./remove.tsx";
import filter from "./filter.tsx";
import inspect from "./inspect.tsx";
import skip from "./skip.tsx";

export default defineCommand({
	aliases: ["alias", "aliases"],
	surfaces: "text",
	description: "Manage Last.fm artist aliases.",
	subcommands: [add, remove, filter, inspect, skip],
	async exec(ctx) {
		await ctx.error("add/remove/filter/inspect/skip");
	},
});
