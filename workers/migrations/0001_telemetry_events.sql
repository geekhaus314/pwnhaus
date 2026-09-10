-- 0001: raw telemetry events (#26).
-- Later phases add their own tables (uptime_checks #28, bookings_log #30,
-- guestbook #34, ask_cache #32, csp_reports #38, github_snapshot #28).

CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  event TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  ts TEXT,
  data TEXT,
  data_bytes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_service_time
  ON telemetry_events (service, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_time
  ON telemetry_events (created_at DESC);
