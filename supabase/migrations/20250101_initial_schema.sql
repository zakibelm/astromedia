-- =====================================
-- ASTROMEDIA V2 - INITIAL MIGRATION
-- =====================================
-- Created: 2025-01-01
-- Description: Core tables for agents, campaigns, and analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================
-- COMPANIES TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    target_audience TEXT,
    budget DECIMAL(10, 2),
    location VARCHAR(100),
    neq VARCHAR(20),  -- Quebec business registry number
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_neq ON companies(neq);

-- =====================================
-- CMO REPORTS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS cmo_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    report_data JSONB NOT NULL,  -- Full report JSON
    total_ai_cost DECIMAL(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cmo_reports_company ON cmo_reports(company_id);
CREATE INDEX idx_cmo_reports_created ON cmo_reports(created_at DESC);

-- =====================================
-- CAMPAIGNS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, completed
    duration_months INTEGER,
    start_date DATE,
    end_date DATE,
    total_budget DECIMAL(10, 2),
    spent_budget DECIMAL(10, 2) DEFAULT 0,
    channels JSONB,  -- List of channels and budgets
    kpis JSONB,      -- Key performance indicators
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_company ON campaigns(company_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- =====================================
-- CONTENT ASSETS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS content_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- image, video, text, carousel
    version VARCHAR(10),  -- A, B for A/B testing
    title VARCHAR(255),
    content TEXT,
    media_url TEXT,
    provider VARCHAR(50), -- nanobanana, seedream, wan, veo3, etc.
    ai_cost DECIMAL(10, 6),
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, published
    validation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_content_campaign ON content_assets(campaign_id);
CREATE INDEX idx_content_type ON content_assets(asset_type);
CREATE INDEX idx_content_status ON content_assets(status);

-- =====================================
-- INSTAGRAM INTERACTIONS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS instagram_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255) UNIQUE NOT NULL,
    sender_id VARCHAR(255) NOT NULL,
    message_text TEXT,
    reply_text TEXT,
    sentiment VARCHAR(50),  -- positive, neutral, negative
    ai_cost DECIMAL(10, 6),
    response_time_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_instagram_sender ON instagram_interactions(sender_id);
CREATE INDEX idx_instagram_timestamp ON instagram_interactions(timestamp DESC);
CREATE INDEX idx_instagram_sentiment ON instagram_interactions(sentiment);

-- =====================================
-- LEAD PROFILES TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS lead_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instagram_user_id VARCHAR(255) UNIQUE,
    business_name VARCHAR(255),
    industry VARCHAR(100),
    location VARCHAR(100),
    follower_count INTEGER,
    engagement_rate DECIMAL(5, 2),  -- Percentage
    last_post_date DATE,
    engagement_score INTEGER DEFAULT 0,  -- 0-100
    total_interactions INTEGER DEFAULT 0,
    lead_status VARCHAR(50) DEFAULT 'new',  -- new, contacted, qualified, converted
    notes TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_interaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_instagram ON lead_profiles(instagram_user_id);
CREATE INDEX idx_leads_score ON lead_profiles(engagement_score DESC);
CREATE INDEX idx_leads_status ON lead_profiles(lead_status);

-- =====================================
-- LOG ENTRIES TABLE (Cost & Operations Tracking)
-- =====================================
CREATE TABLE IF NOT EXISTS log_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    task_id VARCHAR(255),
    agent_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'success',  -- success, failed, fallback_used
    provider_used VARCHAR(50),
    model_used VARCHAR(100),
    input_summary TEXT,
    output_summary TEXT,
    cost_estimate DECIMAL(10, 6),
    duration_ms INTEGER,
    metadata JSONB
);

CREATE INDEX idx_logs_timestamp ON log_entries(timestamp DESC);
CREATE INDEX idx_logs_agent ON log_entries(agent_name);
CREATE INDEX idx_logs_action ON log_entries(action);
CREATE INDEX idx_logs_cost ON log_entries(cost_estimate DESC);

-- =====================================
-- ANALYTICS DAILY TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    channel VARCHAR(50),  -- instagram, facebook, google_ads, etc.
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10, 2) DEFAULT 0,
    ai_cost DECIMAL(10, 6) DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_analytics_unique ON analytics_daily(date, campaign_id, channel);
CREATE INDEX idx_analytics_date ON analytics_daily(date DESC);
CREATE INDEX idx_analytics_campaign ON analytics_daily(campaign_id);

-- =====================================
-- WORKFLOWS TABLE (n8n workflow tracking)
-- =====================================
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_json JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'active',  -- active, paused, error
    executions_count INTEGER DEFAULT 0,
    last_execution TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_name ON workflows(name);

-- =====================================
-- FUNCTION: Update updated_at timestamp
-- =====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================
-- Enable RLS on sensitive tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmo_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

-- Create policies (example - adjust based on your auth setup)
CREATE POLICY "Users can view their own companies" ON companies
    FOR SELECT USING (true);  -- Adjust with auth.uid() when you have auth

CREATE POLICY "Users can insert companies" ON companies
    FOR INSERT WITH CHECK (true);

-- =====================================
-- INITIAL DATA / SEED
-- =====================================
-- Insert a sample company for testing
INSERT INTO companies (name, industry, target_audience, budget, location)
VALUES (
    'Restaurant La Belle Époque (Test)',
    'Restaurant gastronomique',
    'Couples 35-55 ans, revenus moyens-élevés',
    5000.00,
    'Montreal, QC'
) ON CONFLICT DO NOTHING;

-- =====================================
-- COMMENTS
-- =====================================
COMMENT ON TABLE companies IS 'Client companies using AstroMedia';
COMMENT ON TABLE cmo_reports IS 'CMO agent generated marketing strategy reports';
COMMENT ON TABLE campaigns IS 'Marketing campaigns with budget and timeline';
COMMENT ON TABLE content_assets IS 'Generated content (images, videos, text)';
COMMENT ON TABLE instagram_interactions IS 'Instagram auto-reply interactions';
COMMENT ON TABLE lead_profiles IS 'Leads discovered via Google Maps/Instagram';
COMMENT ON TABLE log_entries IS 'All agent operations and cost tracking';
COMMENT ON TABLE analytics_daily IS 'Daily campaign performance metrics';
COMMENT ON TABLE workflows IS 'n8n workflow configurations and status';
