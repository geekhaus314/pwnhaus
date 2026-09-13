-- 0005: broadcast ledger (#39).
-- Admin POSTs to /api/notify; the notify worker fans out to each requested
-- channel and records one row per channel in notify_deliveries. #40 (Discord
-- bot), #41 (Reddit), #42 (Signal) attach as channel senders; #43 (admin
-- console) reads these tables for the ledger view.

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  url TEXT,
  channels TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notify_deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications(id),
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_status_time
  ON notifications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notify_deliveries_notification
  ON notify_deliveries (notification_id);
