import type { SchemaContext } from "@kuristina/database";

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.alterTable("artist_aliases")
		.addColumn("skip_autocorrect", "integer", (col) => col.notNull().defaultTo(0))
		.execute();
}

export async function down(ctx: SchemaContext): Promise<void> {
	await ctx.schema.alterTable("artist_aliases").dropColumn("skip_autocorrect").execute();
}
