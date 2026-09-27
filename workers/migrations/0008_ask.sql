-- #32 Ask-pwn4g3 knowledge base + answer cache (Otis-cover).
-- FTS5 retrieval over a small curated corpus; answers cached by
-- question hash (7-day TTL) so repeat questions never spend neurons.

CREATE VIRTUAL TABLE IF NOT EXISTS ask_docs_fts USING fts5(title, body, tag);

CREATE TABLE IF NOT EXISTS ask_cache (
  question_hash TEXT PRIMARY KEY,
  answer TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ask_cache_expires ON ask_cache(expires_at);

-- Curated corpus: what the site sells, who runs it, how to reach it.
-- Keep bodies short: they ride every retrieval into the model prompt.
INSERT OR IGNORE INTO ask_docs_fts (title, body, tag) VALUES
('Services and prices',
 'Website audit $350 (48h). Site redesign $900. Launch website $1200. Booking system $1800. Online store $2400. Custom web app $2800. Engineering partner $5000+. Shop page has fixed-price Stripe checkout; Book page for custom scope.',
 'services'),
('Booking and contact',
 'Book via the Book page form (name, email, details, service, timeline). Booking confirms by email within 24 hours. Email delivers to the owner inbox. Prefer 50 percent to start instead of full price? Ask over email.',
 'booking'),
('Live proof and lab',
 'Live Lab page runs the Viper-Web3 Solidity analyzer against pasted contracts with severity-coded findings plus an executable audit plan. Status page probes site, gateway, health, components, viper and telemetry from the browser. Stats page charts live gateway latencies with hand-rolled SVG.',
 'proof'),
('About Jake',
 'Jake M. Viefhaus (pwn4g3). Full-stack developer for hire. TypeScript-first: SvelteKit frontends on Cloudflare Pages, Cloudflare Workers backends with D1, R2, Queues. Security background: Solidity triage tooling, audit-plan pipelines.',
 'about'),
('Payments and shop',
 'Shop page sells fixed-price packages with Stripe checkout (embedded on-site with hosted redirect fallback). Receipts go by email. 50 percent deposit option available by asking over email instead of full-price checkout.',
 'payments');
