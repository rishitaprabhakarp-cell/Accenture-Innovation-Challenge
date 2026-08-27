-- ControlPlane.ai — Audit Entries Table
-- Run this in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  use_case_id TEXT NOT NULL,
  use_case_label TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  checker_results JSONB NOT NULL DEFAULT '[]',
  composite_score FLOAT NOT NULL DEFAULT 0,
  action TEXT NOT NULL CHECK (action IN ('allow', 'edit', 'flag', 'block')),
  action_reason TEXT NOT NULL,
  edited_response TEXT,
  pipeline_latency_ms INTEGER NOT NULL DEFAULT 0,
  overlapping_risks TEXT[] DEFAULT '{}',
  feedback TEXT CHECK (feedback IN ('correct', 'incorrect')),
  feedback_note TEXT
);

-- Enable Row Level Security (required for Supabase public schema)
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY;

-- Open policy for this prototype (no auth required)
-- In production: scope policies to authenticated roles
CREATE POLICY "Allow all operations"
  ON audit_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_entries_created_at
  ON audit_entries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entries_use_case_id
  ON audit_entries (use_case_id);

CREATE INDEX IF NOT EXISTS idx_audit_entries_action
  ON audit_entries (action);
