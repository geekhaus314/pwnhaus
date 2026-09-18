-- 0006: lead desk + outreach log (client-acquisition-lab).
-- Stores prospects for Discord-driven, human-approved personalized outreach.
-- Enrichment worker writes signals; draft/approve flow writes outreach_log.

CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  website     TEXT,
  email       TEXT,
  phone       TEXT,
  city        TEXT DEFAULT 'St. Louis',
  niche       TEXT,
  source      TEXT NOT NULL DEFAULT 'manual',
  signals     TEXT,
  status      TEXT NOT NULL DEFAULT 'new',
  notes       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_status_time
  ON leads (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_niche
  ON leads (niche);

CREATE TABLE IF NOT EXISTS outreach_log (
  id             TEXT PRIMARY KEY,
  lead_id        TEXT NOT NULL REFERENCES leads(id),
  draft          TEXT,
  final_message  TEXT,
  channel        TEXT NOT NULL DEFAULT 'email',
  status         TEXT NOT NULL DEFAULT 'drafted',
  sent_at        INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outreach_lead
  ON outreach_log (lead_id);

CREATE INDEX IF NOT EXISTS idx_outreach_status
  ON outreach_log (status);