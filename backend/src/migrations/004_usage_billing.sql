-- Phase 11-12: Usage tracking and subscription billing
-- Run manually in production when synchronize=false

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  price_monthly_cents INT DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR DEFAULT 'active',
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID,
  task_id UUID,
  metric_type VARCHAR NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 0,
  unit VARCHAR DEFAULT 'count',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_events_org ON usage_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_org_created ON usage_events(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_events_metric ON usage_events(organization_id, metric_type);

CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  tokens_used BIGINT DEFAULT 0,
  requests_used BIGINT DEFAULT 0,
  tasks_processed INT DEFAULT 0,
  storage_used BIGINT DEFAULT 0,
  playwright_runs INT DEFAULT 0,
  UNIQUE(organization_id, year, month)
);

-- Seed default plans
INSERT INTO subscription_plans (code, name, price_monthly_cents, limits)
VALUES
  ('free', 'Free', 0, '{"projects":1,"repositories":1,"tasksPerMonth":10,"storageMb":500,"users":2,"tokensPerMonth":50000}'),
  ('starter', 'Starter', 2900, '{"projects":5,"repositories":5,"tasksPerMonth":100,"storageMb":5120,"users":10,"tokensPerMonth":500000}'),
  ('pro', 'Pro', 9900, '{"projects":25,"repositories":25,"tasksPerMonth":1000,"storageMb":51200,"users":50,"tokensPerMonth":5000000}'),
  ('enterprise', 'Enterprise', 0, '{"projects":-1,"repositories":-1,"tasksPerMonth":-1,"storageMb":-1,"users":-1,"tokensPerMonth":-1}')
ON CONFLICT (code) DO NOTHING;

-- Link existing orgs to free plan subscription if missing
INSERT INTO organization_subscriptions (organization_id, plan_id, status)
SELECT o.id, sp.id, 'active'
FROM organizations o
CROSS JOIN subscription_plans sp
WHERE sp.code = COALESCE(o.plan::text, 'free')
  AND NOT EXISTS (
    SELECT 1 FROM organization_subscriptions os WHERE os.organization_id = o.id
  );
