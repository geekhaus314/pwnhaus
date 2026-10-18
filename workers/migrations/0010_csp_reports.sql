-- #38 CSP violation reports (Otis-cover).
-- Browsers POST here via the report-uri directive. Scheduler weekly
-- summary reads this table directly (Otis follow-up); no GET route.

CREATE TABLE IF NOT EXISTS csp_reports (
  id TEXT PRIMARY KEY,
  document_uri TEXT NOT NULL DEFAULT '',
  violated_directive TEXT NOT NULL DEFAULT '',
  blocked_uri TEXT NOT NULL DEFAULT '',
  original_policy TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_csp_reports_created ON csp_reports(created_at DESC);
