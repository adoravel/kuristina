CREATE TABLE IF NOT EXISTS markov_chain (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT NOT NULL,
    suffix TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    UNIQUE(prefix, suffix)
);

CREATE INDEX IF NOT EXISTS idx_markov_prefix ON markov_chain(prefix);
