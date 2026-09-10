-- 0003: scheduler tables (#28).
-- uptime_checks: one row per probe run (hourly).
-- github_snapshot: single-row cache of repo stats (daily sync).

CREATE TABLE IF NOT EXISTS uptime_checks (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 0,
  ok INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  checked_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_uptime_target_time
  ON uptime_checks (target, checked_at DESC);

CREATE TABLE IF NOT EXISTS github_snapshot (
  repo TEXT PRIMARY KEY,
  stars INTEGER NOT NULL DEFAULT 0,
  forks INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  pushed_at TEXT,
  synced_at INTEGER NOT NULL DEFAULT 0
);
