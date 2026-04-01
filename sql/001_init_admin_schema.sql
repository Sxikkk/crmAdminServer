CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(256) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'reviewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name VARCHAR(300) NOT NULL,
  organization_type VARCHAR(50) NOT NULL,
  inn VARCHAR(12),
  ogrn VARCHAR(13),
  email VARCHAR(256),
  phone VARCHAR(20),
  website VARCHAR(200),
  city VARCHAR(100),
  requested_by_email VARCHAR(256) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  decision_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  processed_by_user_id UUID REFERENCES admin_users(id),
  external_organization_id UUID
);

CREATE TABLE IF NOT EXISTS request_events (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES organization_requests(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  actor_user_id UUID REFERENCES admin_users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_requests_status_created_at
  ON organization_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_requests_inn
  ON organization_requests(inn);

CREATE INDEX IF NOT EXISTS idx_org_requests_ogrn
  ON organization_requests(ogrn);

CREATE INDEX IF NOT EXISTS idx_request_events_request_id
  ON request_events(request_id);
