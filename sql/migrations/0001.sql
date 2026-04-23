CREATE TABLE IF NOT EXISTS users (
	user_id BLOB PRIMARY KEY,
	created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
