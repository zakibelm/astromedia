import React from 'react';

export type AgentStatus = 'active' | 'waiting' | 'inactive';
export type CampaignView = 'overview' | 'workflow' | 'content' | 'analytics' | 'knowledge';
export type GovernanceMode = 'follow' | 'semi-auto' | 'full';

// --- NEW: Workflow types ---
export type WorkflowStatus = 'completed' | 'inprogress' | 'pending' | 'waitingValidation' | 'failed' | 'skipped';
export type WorkflowState = Record<string, WorkflowStatus>;
// --- END NEW ---

export interface AgentProfileData {
  id: string;
  nameKey: string;
  descriptionKey: string;
  status: AgentStatus;
  icon: React.ReactElement;
  // FIX: Updated departmentKey to match the department keys defined in constants/agents.tsx
  departmentKey: 'strategy' | 'creative' | 'adaptor' | 'distribution' | 'feedback';
}


export interface WorkflowStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  status: 'completed' | 'inprogress' | 'pending';
  agentId: string;
}

export type ContentStatus = 'waiting' | 'approved';
export interface ContentItem {
  id: string;
  type: 'video' | 'caption' | 'visual' | 'hashtags';
  title: string;
  description: string;
  platforms: string[];
  status: ContentStatus;
  thumbnailUrl: string;
}

export interface AnalyticsData {
    totalReach: number;
    impressions: number;
    engagement: number;
    shares: number;
    platformPerformance: {
        name: string;
        views: number;
        ctr: number;
    }[];
    insights: string[];
}

export interface CampaignData {
    workflow: WorkflowStep[];
    content: ContentItem[];
    analytics: AnalyticsData;
    governanceMode: GovernanceMode;
}


// --- NEW: Types for advanced configuration ---
export type Criteria = "cost" | "speed" | "quality" | "balanced";

export interface AgentConfiguration {
  criteria: Criteria;
  customInstructions: string;
}

export interface KnowledgeFile {
    name: string;
    type: string;
    size: number;
}
// --- END NEW ---


export interface NewCampaignFormData {
  projectName: string;
  companyInfo: {
    name: string;
    sector: string;
    size: string;
    website?: string;
  };
  campaignGoals: {
    objectives: string[];
    targetAudience: string;
    budget: {
      amount: string;
      currency: 'USD' | 'CAD';
    };
    duration: string;
  };
  brandIdentity: {
    priorityChannels: string[];
    tone: string;
    brandValues: string;
    socialLinks?: string;
  };
  governanceMode: GovernanceMode;
  analysisDepth: 'quick' | 'detailed';
  // --- NEW: Advanced config fields ---
  agentConfiguration: Record<string, AgentConfiguration>;
  ragEnabled: boolean;
  // --- END NEW ---
}