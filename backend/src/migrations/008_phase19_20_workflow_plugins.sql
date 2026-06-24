-- Phase 19-20: Workflow Configuration and Plugin Architecture
-- Run manually in production when synchronize=false

CREATE TABLE IF NOT EXISTS workflow_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  approval_gates JSONB NOT NULL DEFAULT '{"analysis":true,"code":true,"pr":true,"riskAutoApproveMaxScore":null}',
  agent_order JSONB NOT NULL DEFAULT '{}',
  notification_rules JSONB NOT NULL DEFAULT '{}',
  validation_rules JSONB NOT NULL DEFAULT '{"blockOnLintFail":true,"blockOnSecurityScan":true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  description TEXT,
  manifest JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugin_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, plugin_id)
);
CREATE INDEX IF NOT EXISTS idx_plugin_installations_org ON plugin_installations(organization_id);
