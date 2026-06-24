-- Phase 5-8: Repository Memory, Similar Tasks, Risk Engine, Auto Reindex, Knowledge Graph
-- Run manually in production when synchronize=false

CREATE TABLE IF NOT EXISTS repository_memory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  commit_sha VARCHAR,
  branch VARCHAR,
  files_count INT DEFAULT 0,
  chunks_count INT DEFAULT 0,
  summary TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_repo_memory_project ON repository_memory_snapshots(project_id);

CREATE TABLE IF NOT EXISTS task_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  requirement TEXT NOT NULL,
  outcome VARCHAR DEFAULT 'pending',
  risk_level VARCHAR,
  impacted_files JSONB DEFAULT '[]',
  lessons JSONB,
  qdrant_point_id VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_task_memory_project ON task_memory(project_id);
CREATE INDEX IF NOT EXISTS idx_task_memory_task ON task_memory(task_id);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  overall_score FLOAT DEFAULT 0,
  risk_level VARCHAR DEFAULT 'medium',
  factors JSONB DEFAULT '{}',
  summary TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_task ON risk_assessments(task_id);

CREATE TABLE IF NOT EXISTS reindex_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trigger_source VARCHAR NOT NULL,
  branch VARCHAR,
  commit_sha VARCHAR,
  changed_files JSONB DEFAULT '[]',
  status VARCHAR DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reindex_project ON reindex_events(project_id);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_commit_sha VARCHAR;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS auto_reindex_enabled BOOLEAN DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_reindex_at TIMESTAMPTZ;
