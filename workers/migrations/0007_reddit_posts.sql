-- 0007: reddit bot post ledger (#41).
-- The reddit worker polls the notify ledger for reddit-channel broadcasts
-- and records one row per submitted notification here, so cron never
-- double-posts and the admin console can link ledger -> reddit thing id.
-- notify_deliveries rows stay authoritative for per-channel status; this
-- table is the bot's own dedupe + permalink record.

CREATE TABLE IF NOT EXISTS reddit_posts (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL UNIQUE REFERENCES notifications(id),
  thing_id TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reddit_posts_status_time
  ON reddit_posts (status, created_at DESC);
