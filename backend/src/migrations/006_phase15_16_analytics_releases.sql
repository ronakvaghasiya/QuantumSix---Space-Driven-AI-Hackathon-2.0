-- Phase 15-16: Engineering Analytics and Release Intelligence
-- Run manually in production when synchronize=false

CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  version_tag VARCHAR NOT NULL,
  merge_commit_sha VARCHAR,
  release_notes TEXT,
  sprint_summary TEXT,
  changelog JSONB DEFAULT '[]',
  impact_summary JSONB DEFAULT '{}',
  risk_summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_releases_org ON releases(organization_id);
CREATE INDEX IF NOT EXISTS idx_releases_project ON releases(project_id);
CREATE INDEX IF NOT EXISTS idx_releases_created ON releases(created_at DESC);
