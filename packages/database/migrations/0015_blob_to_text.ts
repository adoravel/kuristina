import { type SchemaContext, sql } from "@kuristina/database";

function snowflakeToText(snowflake: Uint8Array | bigint | string): string {
	if (typeof snowflake === "string") return snowflake;
	if (typeof snowflake === "bigint") return snowflake.toString();
	const view = new DataView(snowflake.buffer, snowflake.byteOffset, snowflake.byteLength);
	const value = view.getBigUint64(0, false);
	return value.toString();
}

export async function up(ctx: SchemaContext): Promise<void> {
	await ctx.schema
		.createTable("users_new")
		.addColumn("user_id", "text", (col) => col.primaryKey())
		.addColumn(
			"created_at",
			"integer",
			(col) => col.notNull().defaultTo(sql`(strftime('%s', 'now'))`),
		)
		.execute();

	{
		const rows = await sql<{ user_id: Uint8Array; created_at: number }>`
			SELECT user_id, created_at FROM users
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO users_new (user_id, created_at) 
				VALUES (${snowflakeToText(row.user_id)}, ${row.created_at})
			`.execute(ctx);
		}
	}

	await ctx.schema.dropTable("users").execute();
	await ctx.schema.alterTable("users_new").renameTo("users").execute();

	await ctx.schema
		.createTable("tidal_sessions_new")
		.addColumn("discord_id", "text", (col) => col.primaryKey())
		.addColumn("access_token", "text", (col) => col.notNull())
		.addColumn("refresh_token", "text", (col) => col.notNull())
		.addColumn("expires_at", "integer", (col) => col.notNull())
		.addColumn("country_code", "text", (col) => col.notNull())
		.execute();

	{
		const rows = await sql<
			{
				discord_id: Uint8Array;
				access_token: string;
				refresh_token: string;
				expires_at: number;
				country_code: string;
			}
		>`
			SELECT discord_id, access_token, refresh_token, expires_at, country_code FROM tidal_sessions
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO tidal_sessions_new (discord_id, access_token, refresh_token, expires_at, country_code)
				VALUES (${
				snowflakeToText(row.discord_id)
			}, ${row.access_token}, ${row.refresh_token}, ${row.expires_at}, ${row.country_code})
			`.execute(ctx);
		}
	}

	await ctx.schema.dropTable("tidal_sessions").execute();
	await ctx.schema.alterTable("tidal_sessions_new").renameTo("tidal_sessions").execute();

	await ctx.schema
		.createTable("tidal_device_auth_new")
		.addColumn("device_code", "text", (col) => col.primaryKey())
		.addColumn("user_id", "text", (col) => col.notNull())
		.addColumn("created_at", "integer", (col) => col.notNull())
		.execute();

	{
		const rows = await sql<{ device_code: string; user_id: Uint8Array; created_at: number }>`
			SELECT device_code, user_id, created_at FROM tidal_device_auth
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO tidal_device_auth_new (device_code, user_id, created_at)
				VALUES (${row.device_code}, ${snowflakeToText(row.user_id)}, ${row.created_at})
			`.execute(ctx);
		}
	}

	await ctx.schema.dropTable("tidal_device_auth").execute();
	await ctx.schema.alterTable("tidal_device_auth_new").renameTo("tidal_device_auth").execute();

	await ctx.schema
		.createTable("scrobble_accounts_new")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("discord_id", "text", (col) => col.notNull())
		.addColumn("provider", "text", (col) => col.notNull())
		.addColumn("username", "text", (col) => col.notNull())
		.addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
		.addColumn("linked_at", "integer", (col) => col.notNull())
		.addUniqueConstraint("scrobble_accounts_discord_provider_unique", ["discord_id", "provider"])
		.execute();

	{
		const rows = await sql<
			{
				id: number;
				discord_id: Uint8Array;
				provider: string;
				username: string;
				is_default: number;
				linked_at: number;
			}
		>`
			SELECT id, discord_id, provider, username, is_default, linked_at FROM scrobble_accounts
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO scrobble_accounts_new (id, discord_id, provider, username, is_default, linked_at)
				VALUES (${row.id}, ${
				snowflakeToText(row.discord_id)
			}, ${row.provider}, ${row.username}, ${row.is_default}, ${row.linked_at})
			`.execute(ctx);
		}
	}

	await ctx.schema.dropTable("scrobble_accounts").execute();
	await ctx.schema.alterTable("scrobble_accounts_new").renameTo("scrobble_accounts").execute();
	await ctx.schema.createIndex("idx_scrobble_accounts_discord_id").on("scrobble_accounts").column(
		"discord_id",
	).execute();
	await ctx.schema.createIndex("idx_scrobble_accounts_provider").on("scrobble_accounts").column(
		"provider",
	).execute();

	await ctx.schema
		.createTable("guild_members_new")
		.addColumn("discord_id", "text", (col) => col.notNull())
		.addColumn("guild_id", "text", (col) => col.notNull())
		.addColumn("joined_at", "integer", (col) => col.notNull())
		.addPrimaryKeyConstraint("guild_members_pk", ["discord_id", "guild_id"])
		.modifyEnd(sql`without rowid`)
		.execute();

	{
		const rows = await sql<{ discord_id: Uint8Array; guild_id: Uint8Array; joined_at: number }>`
			SELECT discord_id, guild_id, joined_at FROM guild_members
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO guild_members_new (discord_id, guild_id, joined_at)
				VALUES (${snowflakeToText(row.discord_id)}, ${
				snowflakeToText(row.guild_id)
			}, ${row.joined_at})
			`.execute(ctx);
		}
	}

	await ctx.schema.dropTable("guild_members").execute();
	await ctx.schema.alterTable("guild_members_new").renameTo("guild_members").execute();

	const hasCompanions = await sql`
		SELECT name FROM sqlite_master WHERE type='table' AND name='message_companions'
	`.execute(ctx);

	if (hasCompanions.rows.length > 0) {
		await ctx.schema
			.createTable("message_companions_new")
			.addColumn("source_message_id", "text", (col) => col.notNull())
			.addColumn("response_message_id", "text", (col) => col.notNull().primaryKey())
			.addColumn("channel_id", "text", (col) => col.notNull())
			.addColumn("kind", "text", (col) => col.notNull())
			.addColumn("created_at", "integer", (col) => col.notNull())
			.execute();

		{
			const rows = await sql<
				{
					source_message_id: Uint8Array;
					response_message_id: Uint8Array;
					channel_id: Uint8Array;
					kind: string;
					created_at: number;
				}
			>`
				SELECT source_message_id, response_message_id, channel_id, kind, created_at FROM message_companions
			`.execute(ctx);
			for (const row of rows.rows) {
				await sql`
					INSERT INTO message_companions_new (source_message_id, response_message_id, channel_id, kind, created_at)
					VALUES (
						${snowflakeToText(row.source_message_id)}, 
						${snowflakeToText(row.response_message_id)}, 
						${snowflakeToText(row.channel_id)}, 
						${row.kind}, 
						${row.created_at}
					)
				`.execute(ctx);
			}
		}

		await ctx.schema.dropTable("message_companions").execute();
		await ctx.schema.alterTable("message_companions_new").renameTo("message_companions").execute();

		await ctx.schema.createIndex("idx_message_companions_source").on("message_companions")
			.column("source_message_id").execute();
		await ctx.schema.createIndex("idx_message_companions_kind").on("message_companions")
			.column("kind").execute();
	}
}

export async function down(ctx: SchemaContext): Promise<void> {
	const hasCompanions = await sql`
		SELECT name FROM sqlite_master WHERE type='table' AND name='message_companions'
	`.execute(ctx);

	if (hasCompanions.rows.length > 0) {
		await ctx.schema
			.createTable("message_companions_new")
			.addColumn("source_message_id", "blob", (col) => col.notNull())
			.addColumn("response_message_id", "blob", (col) => col.notNull().primaryKey())
			.addColumn("channel_id", "blob", (col) => col.notNull())
			.addColumn("kind", "text", (col) => col.notNull())
			.addColumn("created_at", "integer", (col) => col.notNull())
			.execute();

		{
			const rows = await sql<
				{
					source_message_id: string;
					response_message_id: string;
					channel_id: string;
					kind: string;
					created_at: number;
				}
			>`
				SELECT source_message_id, response_message_id, channel_id, kind, created_at FROM message_companions
			`.execute(ctx);
			for (const row of rows.rows) {
				await sql`
					INSERT INTO message_companions_new (source_message_id, response_message_id, channel_id, kind, created_at)
					VALUES (
						${BigInt(row.source_message_id)}, 
						${BigInt(row.response_message_id)}, 
						${BigInt(row.channel_id)}, 
						${row.kind}, 
						${row.created_at}
					)
				`.execute(ctx);
			}
		}

		await ctx.schema.dropTable("message_companions").execute();
		await ctx.schema.alterTable("message_companions_new").renameTo("message_companions").execute();
	}

	await ctx.schema
		.createTable("guild_members_new")
		.addColumn("discord_id", "blob", (col) => col.notNull())
		.addColumn("guild_id", "blob", (col) => col.notNull())
		.addColumn("joined_at", "integer", (col) => col.notNull())
		.addPrimaryKeyConstraint("guild_members_pk", ["discord_id", "guild_id"])
		.modifyEnd(sql`without rowid`)
		.execute();
	{
		const rows = await sql<{ discord_id: string; guild_id: string; joined_at: number }>`
			SELECT discord_id, guild_id, joined_at FROM guild_members
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO guild_members_new (discord_id, guild_id, joined_at)
				VALUES (${BigInt(row.discord_id)}, ${BigInt(row.guild_id)}, ${row.joined_at})
			`.execute(ctx);
		}
	}
	await ctx.schema.dropTable("guild_members").execute();
	await ctx.schema.alterTable("guild_members_new").renameTo("guild_members").execute();

	await ctx.schema
		.createTable("scrobble_accounts_new")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("discord_id", "blob", (col) => col.notNull())
		.addColumn("provider", "text", (col) => col.notNull())
		.addColumn("username", "text", (col) => col.notNull())
		.addColumn("is_default", "integer", (col) => col.notNull().defaultTo(0))
		.addColumn("linked_at", "integer", (col) => col.notNull())
		.addUniqueConstraint("scrobble_accounts_discord_provider_unique", ["discord_id", "provider"])
		.execute();
	{
		const rows = await sql<
			{
				id: number;
				discord_id: string;
				provider: string;
				username: string;
				is_default: number;
				linked_at: number;
			}
		>`
			SELECT id, discord_id, provider, username, is_default, linked_at FROM scrobble_accounts
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO scrobble_accounts_new (id, discord_id, provider, username, is_default, linked_at)
				VALUES (${row.id}, ${
				BigInt(row.discord_id)
			}, ${row.provider}, ${row.username}, ${row.is_default}, ${row.linked_at})
			`.execute(ctx);
		}
	}
	await ctx.schema.dropTable("scrobble_accounts").execute();
	await ctx.schema.alterTable("scrobble_accounts_new").renameTo("scrobble_accounts").execute();
	await ctx.schema.createIndex("idx_scrobble_accounts_discord_id").on("scrobble_accounts").column(
		"discord_id",
	).execute();
	await ctx.schema.createIndex("idx_scrobble_accounts_provider").on("scrobble_accounts").column(
		"provider",
	).execute();

	await ctx.schema
		.createTable("tidal_device_auth_new")
		.addColumn("device_code", "text", (col) => col.primaryKey())
		.addColumn("user_id", "blob", (col) => col.notNull())
		.addColumn("created_at", "integer", (col) => col.notNull())
		.execute();
	{
		const rows = await sql<{ device_code: string; user_id: string; created_at: number }>`
			SELECT device_code, user_id, created_at FROM tidal_device_auth
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO tidal_device_auth_new (device_code, user_id, created_at)
				VALUES (${row.device_code}, ${BigInt(row.user_id)}, ${row.created_at})
			`.execute(ctx);
		}
	}
	await ctx.schema.dropTable("tidal_device_auth").execute();
	await ctx.schema.alterTable("tidal_device_auth_new").renameTo("tidal_device_auth").execute();

	await ctx.schema
		.createTable("tidal_sessions_new")
		.addColumn("discord_id", "blob", (col) => col.primaryKey())
		.addColumn("access_token", "text", (col) => col.notNull())
		.addColumn("refresh_token", "text", (col) => col.notNull())
		.addColumn("expires_at", "integer", (col) => col.notNull())
		.addColumn("country_code", "text", (col) => col.notNull())
		.execute();
	{
		const rows = await sql<
			{
				discord_id: string;
				access_token: string;
				refresh_token: string;
				expires_at: number;
				country_code: string;
			}
		>`
			SELECT discord_id, access_token, refresh_token, expires_at, country_code FROM tidal_sessions
		`.execute(ctx);
		for (const row of rows.rows) {
			await sql`
				INSERT INTO tidal_sessions_new (discord_id, access_token, refresh_token, expires_at, country_code)
				VALUES (${
				BigInt(row.discord_id)
			}, ${row.access_token}, ${row.refresh_token}, ${row.expires_at}, ${row.country_code})
			`.execute(ctx);
		}
	}
	await ctx.schema.dropTable("tidal_sessions").execute();
	await ctx.schema.alterTable("tidal_sessions_new").renameTo("tidal_sessions").execute();

	await ctx.schema
		.createTable("users_new")
		.addColumn("user_id", "blob", (col) => col.primaryKey())
		.addColumn(
			"created_at",
			"integer",
			(col) => col.notNull().defaultTo(sql`(strftime('%s', 'now'))`),
		)
		.execute();
	{
		const rows = await sql<
			{ user_id: string; created_at: number }
		>`SELECT user_id, created_at FROM users`
			.execute(ctx);
		for (const row of rows.rows) {
			await sql`INSERT INTO users_new (user_id, created_at) VALUES (${
				BigInt(row.user_id)
			}, ${row.created_at})`
				.execute(ctx);
		}
	}
	await ctx.schema.dropTable("users").execute();
	await ctx.schema.alterTable("users_new").renameTo("users").execute();
}
