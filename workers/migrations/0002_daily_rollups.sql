-- 0002: per-day event counters (#26).
-- Rolled up by the scheduler's daily job (#28); the /stats dashboard (#27)
-- reads this table instead of scanning telemetry_events.

CREATE TABLE IF NOT EXISTS daily_rollups (
  day TEXT NOT NULL,
  service TEXT NOT NULL,
  event TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, service, event)
);

CREATE INDEX IF NOT EXISTS idx_rollups_day
  ON daily_rollups (day DESC);
