-- 0004: booking pipeline ledger (#30).
-- Row is written synchronously at POST (status='queued'), then the queue
-- consumer flips it: sent | failed (non-retryable) | stays queued while
-- retrying. /status pages (#29) and jake's form (#31) read this table.

CREATE TABLE IF NOT EXISTS bookings_log (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  service TEXT,
  timeline TEXT,
  details TEXT NOT NULL,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  client_ip TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_status_time
  ON bookings_log (status, created_at DESC);
