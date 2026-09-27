-- 0011: public site-audit runs + privacy-safe geo rollup (#63/#64).
--
-- audit_runs is the evidence table for POST /api/audit: one row per scan,
-- with the measured facts (not a summary verdict) and every scalar the
-- grade was computed from, so any number the UI shows can be recomputed
-- from this row. Replaces the Prisma `AuditLog` model from the imported
-- patch set, which stored a hardcoded security score with no evidence.
--
-- audit_daily is the fleet aggregate behind GET /api/audit/summary. Kept
-- separate from audit_runs so the public counter survives row pruning.
--
-- geo_daily is the GeoFootprint idea with the identifiability removed:
-- country + region counts per day. No IP, no city, no coordinates, no
-- per-visitor row. Nothing here can single out a person.

CREATE TABLE IF NOT EXISTS audit_runs (
  id             TEXT PRIMARY KEY,
  host           TEXT NOT NULL,
  requested_url  TEXT NOT NULL,
  final_url      TEXT,
  https          INTEGER NOT NULL DEFAULT 0,
  downgraded     INTEGER NOT NULL DEFAULT 0,
  status         INTEGER NOT NULL DEFAULT 0,
  chain_len      INTEGER NOT NULL DEFAULT 1,
  ttfb_ms        INTEGER,
  bytes          INTEGER,
  grade          TEXT,
  penalty        INTEGER NOT NULL DEFAULT 0,
  passed         INTEGER NOT NULL DEFAULT 0,
  failed         INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL DEFAULT 0,
  tech           TEXT,
  error          TEXT,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_time
  ON audit_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_runs_host
  ON audit_runs (host, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_daily (
  day            TEXT NOT NULL,
  host           TEXT NOT NULL,
  runs           INTEGER NOT NULL DEFAULT 0,
  failed_runs    INTEGER NOT NULL DEFAULT 0,
  penalty_sum    INTEGER NOT NULL DEFAULT 0,
  last_grade     TEXT,
  last_at        INTEGER NOT NULL,
  PRIMARY KEY (day, host)
);

CREATE INDEX IF NOT EXISTS idx_audit_daily_host
  ON audit_daily (host, day DESC);

CREATE TABLE IF NOT EXISTS geo_daily (
  day            TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT '??',
  region         TEXT NOT NULL DEFAULT '??',
  hits           INTEGER NOT NULL DEFAULT 0,
  last_at        INTEGER NOT NULL,
  PRIMARY KEY (day, country, region)
);

CREATE INDEX IF NOT EXISTS idx_geo_daily_day
  ON geo_daily (day DESC);
