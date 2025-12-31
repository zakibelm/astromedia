-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GovernanceMode" AS ENUM ('GUIDED', 'SEMI_AUTO', 'AUTO');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('IDLE', 'READY', 'RUNNING', 'WAITING_VALIDATION', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'TEXT', 'CAPTION', 'HASHTAGS', 'SCRIPT', 'VOICEOVER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'ENGAGED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "apiQuota" INTEGER NOT NULL DEFAULT 1000,
    "apiUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "governanceMode" "GovernanceMode" NOT NULL DEFAULT 'SEMI_AUTO',
    "briefData" JSONB NOT NULL,
    "brandProfile" TEXT NOT NULL,
    "goals" TEXT[],
    "targetAudience" TEXT NOT NULL,
    "budget" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timeline" TEXT NOT NULL,
    "currentPhase" TEXT,
    "phaseStatuses" JSONB NOT NULL DEFAULT '{}',
    "contextData" JSONB NOT NULL DEFAULT '{}',
    "totalCost" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignPhase" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'IDLE',
    "inputData" JSONB,
    "outputData" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "cost" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "modelUsed" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "content" TEXT,
    "fileUrl" TEXT,
    "thumbnailUrl" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "metadata" JSONB,
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "action" TEXT NOT NULL,
    "message" TEXT,
    "phaseId" TEXT,
    "agentId" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "cost" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "labels" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_interactions" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "message_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message_text" TEXT,
    "reply_text" TEXT,
    "sentiment" TEXT,
    "ai_cost" DECIMAL(10,6),
    "response_time_ms" INTEGER,
    "timestamp" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_interactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message_text" TEXT,
    "reply_text" TEXT,
    "sentiment" TEXT,
    "ai_cost" DECIMAL(10,6),
    "response_time_ms" INTEGER,
    "timestamp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_profiles" (
    "id" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "instagram_user_id" TEXT,
    "username" TEXT,
    "display_name" TEXT,
    "business_name" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "follower_count" INTEGER,
    "engagement_rate" DECIMAL(5,2),
    "last_post_date" DATE,
    "engagement_score" INTEGER NOT NULL DEFAULT 0,
    "total_interactions" INTEGER NOT NULL DEFAULT 0,
    "lead_status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_interaction" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cmo_reports" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "report_data" JSONB NOT NULL,
    "total_ai_cost" DECIMAL(10,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cmo_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_jobs" (
    "id" TEXT NOT NULL,
    "queue_name" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "job_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error_message" TEXT,
    "attempts_made" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "queue_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_community_interactions" (
    "id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "author" TEXT,
    "sentiment" TEXT,
    "priority" TEXT,
    "requires_human" BOOLEAN NOT NULL DEFAULT false,
    "response_time_seconds" DOUBLE PRECISION,
    "campaign_id" TEXT,
    "lead_id" TEXT,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_community_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_seo_optimizations" (
    "id" TEXT NOT NULL,
    "content_preview" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "primary_keywords" JSONB NOT NULL,
    "secondary_keywords" JSONB NOT NULL,
    "seo_title" TEXT,
    "meta_description" TEXT,
    "factual_accuracy_score" INTEGER NOT NULL,
    "citation_readiness" BOOLEAN NOT NULL DEFAULT false,
    "eeat_score" INTEGER,
    "citation_excerpts" JSONB,
    "campaign_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_seo_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_compliance_audits" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "safe_to_publish" BOOLEAN NOT NULL,
    "violations_count" INTEGER NOT NULL DEFAULT 0,
    "violations_details" JSONB,
    "target_regions" JSONB NOT NULL,
    "checks_performed" JSONB NOT NULL,
    "corrected_version" TEXT,
    "required_mentions" JSONB,
    "campaign_id" TEXT,
    "reviewed_by_human" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_compliance_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_trends" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "virality_score" INTEGER NOT NULL,
    "relevance_score" INTEGER NOT NULL,
    "velocity" TEXT,
    "volume" INTEGER,
    "engagement_rate" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "hashtags" JSONB,
    "durability" TEXT,
    "recommended_action" TEXT,
    "recommended_format" TEXT,
    "recommended_timing" TEXT,
    "estimated_reach" TEXT,
    "difficulty" TEXT,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acted_upon" BOOLEAN NOT NULL DEFAULT false,
    "timeframe" TEXT,

    CONSTRAINT "agent_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_crisis_alerts" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "crisis_score" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "crisis_type" TEXT NOT NULL,
    "sentiment_positive" DOUBLE PRECISION,
    "sentiment_neutral" DOUBLE PRECISION,
    "sentiment_negative" DOUBLE PRECISION,
    "sentiment_trend" TEXT,
    "key_issues" JSONB,
    "amplifiers" JSONB,
    "recommended_actions" JSONB,
    "statement_draft" TEXT,
    "escalation_required" BOOLEAN NOT NULL DEFAULT false,
    "reputation_damage" TEXT,
    "financial_risk" TEXT,
    "recovery_time" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMP(3),
    "monitoring_frequency" TEXT,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_crisis_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_metrics" (
    "id" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "total_calls" INTEGER NOT NULL DEFAULT 0,
    "successful_calls" INTEGER NOT NULL DEFAULT 0,
    "failed_calls" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "min_response_time" DOUBLE PRECISION,
    "max_response_time" DOUBLE PRECISION,
    "last_execution" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'all_time',

    CONSTRAINT "agent_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "CampaignPhase_campaignId_idx" ON "CampaignPhase"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignPhase_phaseId_idx" ON "CampaignPhase"("phaseId");

-- CreateIndex
CREATE INDEX "CampaignPhase_status_idx" ON "CampaignPhase"("status");

-- CreateIndex
CREATE INDEX "Asset_campaignId_idx" ON "Asset"("campaignId");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "CampaignLog_campaignId_idx" ON "CampaignLog"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignLog_timestamp_idx" ON "CampaignLog"("timestamp");

-- CreateIndex
CREATE INDEX "CampaignLog_level_idx" ON "CampaignLog"("level");

-- CreateIndex
CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");

-- CreateIndex
CREATE INDEX "UsageLog_timestamp_idx" ON "UsageLog"("timestamp");

-- CreateIndex
CREATE INDEX "KnowledgeFile_userId_idx" ON "KnowledgeFile"("userId");

-- CreateIndex
CREATE INDEX "SystemMetric_metricName_idx" ON "SystemMetric"("metricName");

-- CreateIndex
CREATE INDEX "SystemMetric_timestamp_idx" ON "SystemMetric"("timestamp");

-- CreateIndex
CREATE INDEX "social_interactions_platform_idx" ON "social_interactions"("platform");

-- CreateIndex
CREATE INDEX "social_interactions_sender_id_idx" ON "social_interactions"("sender_id");

-- CreateIndex
CREATE INDEX "social_interactions_timestamp_idx" ON "social_interactions"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "social_interactions_sentiment_idx" ON "social_interactions"("sentiment");

-- CreateIndex
CREATE INDEX "social_interactions_platform_sender_id_idx" ON "social_interactions"("platform", "sender_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_interactions_platform_message_id_key" ON "social_interactions"("platform", "message_id");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_interactions_message_id_key" ON "instagram_interactions"("message_id");

-- CreateIndex
CREATE INDEX "instagram_interactions_sender_id_idx" ON "instagram_interactions"("sender_id");

-- CreateIndex
CREATE INDEX "instagram_interactions_timestamp_idx" ON "instagram_interactions"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "instagram_interactions_sentiment_idx" ON "instagram_interactions"("sentiment");

-- CreateIndex
CREATE UNIQUE INDEX "lead_profiles_platform_user_id_key" ON "lead_profiles"("platform_user_id");

-- CreateIndex
CREATE INDEX "lead_profiles_platform_user_id_idx" ON "lead_profiles"("platform_user_id");

-- CreateIndex
CREATE INDEX "lead_profiles_platform_idx" ON "lead_profiles"("platform");

-- CreateIndex
CREATE INDEX "lead_profiles_instagram_user_id_idx" ON "lead_profiles"("instagram_user_id");

-- CreateIndex
CREATE INDEX "lead_profiles_engagement_score_idx" ON "lead_profiles"("engagement_score" DESC);

-- CreateIndex
CREATE INDEX "lead_profiles_lead_status_idx" ON "lead_profiles"("lead_status");

-- CreateIndex
CREATE INDEX "lead_profiles_platform_lead_status_idx" ON "lead_profiles"("platform", "lead_status");

-- CreateIndex
CREATE INDEX "cmo_reports_created_at_idx" ON "cmo_reports"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "queue_jobs_job_id_key" ON "queue_jobs"("job_id");

-- CreateIndex
CREATE INDEX "queue_jobs_queue_name_idx" ON "queue_jobs"("queue_name");

-- CreateIndex
CREATE INDEX "queue_jobs_status_idx" ON "queue_jobs"("status");

-- CreateIndex
CREATE INDEX "queue_jobs_created_at_idx" ON "queue_jobs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "agent_community_interactions_platform_idx" ON "agent_community_interactions"("platform");

-- CreateIndex
CREATE INDEX "agent_community_interactions_sentiment_idx" ON "agent_community_interactions"("sentiment");

-- CreateIndex
CREATE INDEX "agent_community_interactions_priority_idx" ON "agent_community_interactions"("priority");

-- CreateIndex
CREATE INDEX "agent_community_interactions_requires_human_idx" ON "agent_community_interactions"("requires_human");

-- CreateIndex
CREATE INDEX "agent_community_interactions_created_at_idx" ON "agent_community_interactions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "agent_seo_optimizations_industry_idx" ON "agent_seo_optimizations"("industry");

-- CreateIndex
CREATE INDEX "agent_seo_optimizations_content_type_idx" ON "agent_seo_optimizations"("content_type");

-- CreateIndex
CREATE INDEX "agent_seo_optimizations_factual_accuracy_score_idx" ON "agent_seo_optimizations"("factual_accuracy_score");

-- CreateIndex
CREATE INDEX "agent_seo_optimizations_created_at_idx" ON "agent_seo_optimizations"("created_at" DESC);

-- CreateIndex
CREATE INDEX "agent_compliance_audits_status_idx" ON "agent_compliance_audits"("status");

-- CreateIndex
CREATE INDEX "agent_compliance_audits_risk_level_idx" ON "agent_compliance_audits"("risk_level");

-- CreateIndex
CREATE INDEX "agent_compliance_audits_safe_to_publish_idx" ON "agent_compliance_audits"("safe_to_publish");

-- CreateIndex
CREATE INDEX "agent_compliance_audits_created_at_idx" ON "agent_compliance_audits"("created_at" DESC);

-- CreateIndex
CREATE INDEX "agent_trends_industry_idx" ON "agent_trends"("industry");

-- CreateIndex
CREATE INDEX "agent_trends_virality_score_idx" ON "agent_trends"("virality_score");

-- CreateIndex
CREATE INDEX "agent_trends_relevance_score_idx" ON "agent_trends"("relevance_score");

-- CreateIndex
CREATE INDEX "agent_trends_acted_upon_idx" ON "agent_trends"("acted_upon");

-- CreateIndex
CREATE INDEX "agent_trends_detected_at_idx" ON "agent_trends"("detected_at" DESC);

-- CreateIndex
CREATE INDEX "agent_crisis_alerts_brand_idx" ON "agent_crisis_alerts"("brand");

-- CreateIndex
CREATE INDEX "agent_crisis_alerts_severity_idx" ON "agent_crisis_alerts"("severity");

-- CreateIndex
CREATE INDEX "agent_crisis_alerts_status_idx" ON "agent_crisis_alerts"("status");

-- CreateIndex
CREATE INDEX "agent_crisis_alerts_escalation_required_idx" ON "agent_crisis_alerts"("escalation_required");

-- CreateIndex
CREATE INDEX "agent_crisis_alerts_detected_at_idx" ON "agent_crisis_alerts"("detected_at" DESC);

-- CreateIndex
CREATE INDEX "agent_metrics_agent_type_idx" ON "agent_metrics"("agent_type");

-- CreateIndex
CREATE INDEX "agent_metrics_period_idx" ON "agent_metrics"("period");

-- CreateIndex
CREATE UNIQUE INDEX "agent_metrics_agent_type_period_key" ON "agent_metrics"("agent_type", "period");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignPhase" ADD CONSTRAINT "CampaignPhase_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLog" ADD CONSTRAINT "CampaignLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
