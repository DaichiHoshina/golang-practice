-- Go Study API - D1 Schema

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,       -- GitHub user ID
  login      TEXT NOT NULL,          -- GitHub username
  name       TEXT,                   -- Display name
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progress (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL,          -- JSON blob of all localStorage data
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
