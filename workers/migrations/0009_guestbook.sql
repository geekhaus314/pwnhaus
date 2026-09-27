-- #34 Guestbook with moderation queue (Otis-cover).
-- Entries land as pending and only approved rows are ever listed.
-- Approval: wrangler d1 execute on pwn4g3-db, or admin-console follow-up.

CREATE TABLE IF NOT EXISTS guestbook (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guestbook_status_created ON guestbook(status, created_at DESC);
