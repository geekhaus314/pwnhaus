/**
 * Lead desk types + helpers for the client-acquisition pipeline.
 * Used by enrichment, Discord bot, and outreach flows.
 */

export type LeadStatus =
  | 'new'
  | 'enriched'
  | 'drafted'
  | 'contacted'
  | 'replied'
  | 'won'
  | 'lost';

export type LeadNiche =
  | 'clinic'
  | 'photographer'
  | 'ecommerce'
  | 'local-service'
  | 'other';

export type LeadSource =
  | 'manual'
  | 'chamber'
  | 'category'
  | 'research'
  | 'inbound';

export interface LeadSignals {
  tech?: string[];
  painPoints?: string[];
  services?: string[];
  notes?: string;
}

export interface Lead {
  id: string;
  name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  city: string;
  niche: LeadNiche | null;
  source: LeadSource;
  signals: LeadSignals | null;
  status: LeadStatus;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export type OutreachStatus =
  | 'drafted'
  | 'approved'
  | 'sent'
  | 'bounced'
  | 'failed';

export interface OutreachLog {
  id: string;
  lead_id: string;
  draft: string | null;
  final_message: string | null;
  channel: 'email' | 'other';
  status: OutreachStatus;
  sent_at: number | null;
  created_at: number;
}

export function createLeadId(): string {
  return crypto.randomUUID();
}

export function parseSignals(raw: string | null): LeadSignals | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LeadSignals;
  } catch {
    return null;
  }
}

export function serializeSignals(signals: LeadSignals | null): string | null {
  return signals ? JSON.stringify(signals) : null;
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}