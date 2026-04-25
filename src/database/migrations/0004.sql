CREATE TABLE IF NOT EXISTS markov_words (
    word TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_markov_words_count ON markov_words(count);
