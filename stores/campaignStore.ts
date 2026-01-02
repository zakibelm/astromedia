// Zustand Campaign Store
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type PhaseStatus = 
  | 'idle' 
  | 'ready' 
  | 'running' 
  | 'waitingValidation' 
  | 'completed' 
  | 'failed' 
  | 'skipped';

export type GovernanceMode = 'guided' | 'semi_auto' | 'auto';

export interface CampaignBrief {
  companyName: string;
  website?: string;
  sector: string;
  targetAudience: string;
  objectives: string[];
  budget: { amount: number; currency: string };
  duration: string;
  brandValues: string;
  tone: string;
  socialLinks?: Record<string, string>;
}

export interface CampaignPhase {
  id: string;
  titleKey: string;
  descriptionKey: string;
  agent: string;
  status: PhaseStatus;
  output?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  latencyMs?: number;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'text';
  category: string;
  url?: string;
  content?: string;
  provider?: string;
  model?: string;
  status: 'pending' | 'approved' | 'rejected';
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  governanceMode: GovernanceMode;
  brief: CampaignBrief;
  phases: Record<string, CampaignPhase>;
  context: Record<string, unknown>;
  assets: GeneratedAsset[];
  totalCost: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

interface CampaignState {
  // State
  campaigns: Record<string, Campaign>;
  activeCampaignId: string | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  activeCampaign: () => Campaign | null;

  // Campaign CRUD
  createCampaign: (brief: CampaignBrief, governanceMode: GovernanceMode) => string;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  setActiveCampaign: (id: string | null) => void;

  // Phase management
  updatePhaseStatus: (campaignId: string, phaseId: string, status: PhaseStatus, output?: unknown) => void;
  setPhaseError: (campaignId: string, phaseId: string, error: string) => void;
  approvePhase: (campaignId: string, phaseId: string, feedback?: string) => void;
  rejectPhase: (campaignId: string, phaseId: string, reason: string) => void;

  // Context management
  updateContext: (campaignId: string, key: string, value: unknown) => void;
  mergeContext: (campaignId: string, context: Record<string, unknown>) => void;

  // Asset management
  addAsset: (campaignId: string, asset: Omit<GeneratedAsset, 'id' | 'createdAt'>) => string;
  updateAsset: (campaignId: string, assetId: string, updates: Partial<GeneratedAsset>) => void;
  approveAsset: (campaignId: string, assetId: string) => void;
  rejectAsset: (campaignId: string, assetId: string) => void;

  // Cost tracking
  addCost: (campaignId: string, cost: number) => void;

  // Loading state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Persistence
  loadCampaigns: () => Promise<void>;
  saveCampaign: (campaignId: string) => Promise<void>;
}

// Default phases template
const DEFAULT_PHASES: Record<string, Omit<CampaignPhase, 'status'>> = {
  briefing: { id: 'briefing', titleKey: 'phase.briefing', descriptionKey: 'phase.briefing.desc', agent: 'Human' },
  marketAnalysis: { id: 'marketAnalysis', titleKey: 'phase.marketAnalysis', descriptionKey: 'phase.marketAnalysis.desc', agent: 'MarketAnalyst' },
  strategy: { id: 'strategy', titleKey: 'phase.strategy', descriptionKey: 'phase.strategy.desc', agent: 'CMO' },
  seo: { id: 'seo', titleKey: 'phase.seo', descriptionKey: 'phase.seo.desc', agent: 'SEO' },
  content: { id: 'content', titleKey: 'phase.content', descriptionKey: 'phase.content.desc', agent: 'ContentWriter' },
  copywriting: { id: 'copywriting', titleKey: 'phase.copywriting', descriptionKey: 'phase.copywriting.desc', agent: 'Copywriter' },
  scriptwriting: { id: 'scriptwriting', titleKey: 'phase.scriptwriting', descriptionKey: 'phase.scriptwriting.desc', agent: 'Scriptwriter' },
  design: { id: 'design', titleKey: 'phase.design', descriptionKey: 'phase.design.desc', agent: 'designer' },
  video: { id: 'video', titleKey: 'phase.video', descriptionKey: 'phase.video.desc', agent: 'video-producer' },
  social: { id: 'social', titleKey: 'phase.social', descriptionKey: 'phase.social.desc', agent: 'Social' },
};

export const useCampaignStore = create<CampaignState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        campaigns: {},
        activeCampaignId: null,
        isLoading: false,
        error: null,

        // Computed
        activeCampaign: () => {
          const { campaigns, activeCampaignId } = get();
          return activeCampaignId ? campaigns[activeCampaignId] || null : null;
        },

        // Create a new campaign
        createCampaign: (brief, governanceMode) => {
          const id = `campaign_${crypto.randomUUID()}`;
          const now = Date.now();

          const phases: Record<string, CampaignPhase> = {};
          for (const [key, phase] of Object.entries(DEFAULT_PHASES)) {
            phases[key] = {
              ...phase,
              status: key === 'briefing' ? 'completed' : 'idle',
            };
          }

          set((state) => {
            state.campaigns[id] = {
              id,
              name: `${brief.companyName} Campaign`,
              status: 'draft',
              governanceMode,
              brief,
              phases,
              context: {
                brandProfile: `${brief.companyName} - ${brief.sector}`,
                goals: brief.objectives.join(', '),
                persona: brief.targetAudience,
                budget: `${brief.budget.amount} ${brief.budget.currency}`,
                timeline: brief.duration,
                tone: brief.tone,
                briefContext: JSON.stringify(brief),
              },
              assets: [],
              totalCost: 0,
              createdAt: now,
            };
            state.activeCampaignId = id;
          });

          return id;
        },

        // Update campaign
        updateCampaign: (id, updates) => {
          set((state) => {
            if (state.campaigns[id]) {
              Object.assign(state.campaigns[id], updates);
            }
          });
        },

        // Delete campaign
        deleteCampaign: (id) => {
          set((state) => {
            delete state.campaigns[id];
            if (state.activeCampaignId === id) {
              state.activeCampaignId = null;
            }
          });
        },

        // Set active campaign
        setActiveCampaign: (id) => {
          set({ activeCampaignId: id });
        },

        // Update phase status
        updatePhaseStatus: (campaignId, phaseId, status, output) => {
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign?.phases[phaseId]) {
              campaign.phases[phaseId].status = status;
              if (output !== undefined) {
                campaign.phases[phaseId].output = output;
              }
              if (status === 'running') {
                campaign.phases[phaseId].startedAt = Date.now();
              }
              if (status === 'completed' || status === 'failed') {
                const phase = campaign.phases[phaseId];
                phase.completedAt = Date.now();
                if (phase.startedAt) {
                  phase.latencyMs = phase.completedAt - phase.startedAt;
                }
              }
            }
          });
        },

        // Set phase error
        setPhaseError: (campaignId, phaseId, error) => {
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign?.phases[phaseId]) {
              campaign.phases[phaseId].error = error;
              campaign.phases[phaseId].status = 'failed';
            }
          });
        },

        // Approve phase (for validation)
        approvePhase: (campaignId, phaseId, _feedback) => {
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign?.phases[phaseId]) {
              campaign.phases[phaseId].status = 'completed';
              campaign.phases[phaseId].completedAt = Date.now();
            }
          });
        },

        // Reject phase
        rejectPhase: (campaignId, phaseId, reason) => {
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign?.phases[phaseId]) {
              campaign.phases[phaseId].status = 'ready'; // Reset to ready for retry
              campaign.phases[phaseId].error = reason;
            }
          });
        },

        // Update context
        updateContext: (campaignId, key, value) => {
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign) {
              campaign.context[key] = value;
            }
          });
        },

        // Merge context
        mergeContext: (campaignId, context) => {
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign) {
              Object.assign(campaign.context, context);
            }
          });
        },

        // Add asset
        addAsset: (campaignId, asset) => {
          const assetId = `asset_${crypto.randomUUID()}`;
          
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign) {
              campaign.assets.push({
                ...asset,
                id: assetId,
                createdAt: Date.now(),
              });
            }
          });

          return assetId;
        },

        // Update asset
        updateAsset: (campaignId, assetId, updates) => {
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign) {
              const asset = campaign.assets.find(a => a.id === assetId);
              if (asset) {
                Object.assign(asset, updates);
              }
            }
          });
        },

        // Approve asset
        approveAsset: (campaignId, assetId) => {
          get().updateAsset(campaignId, assetId, { status: 'approved' });
        },

        // Reject asset
        rejectAsset: (campaignId, assetId) => {
          get().updateAsset(campaignId, assetId, { status: 'rejected' });
        },

        // Add cost
        addCost: (campaignId, cost) => {
          set((state) => {
            const campaign = state.campaigns[campaignId];
            if (campaign) {
              campaign.totalCost += cost;
            }
          });
        },

        // Loading state
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),

        // Load campaigns from API
        loadCampaigns: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch('/api/v1/campaigns', {
              credentials: 'include',
            });
            
            if (response.ok) {
              const data = await response.json();
              const campaigns: Record<string, Campaign> = {};
              for (const campaign of data.campaigns) {
                campaigns[campaign.id] = campaign;
              }
              set({ campaigns, isLoading: false });
            } else {
              throw new Error('Failed to load campaigns');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load campaigns';
            set({ error: message, isLoading: false });
          }
        },

        // Save campaign to API
        saveCampaign: async (campaignId) => {
          const campaign = get().campaigns[campaignId];
          if (!campaign) return;

          try {
            await fetch(`/api/v1/campaigns/${campaignId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(campaign),
            });
          } catch (error) {
            console.error('Failed to save campaign:', error);
          }
        },
      }))
    ),
    { name: 'CampaignStore' }
  )
);

// Selector hooks
export const useActiveCampaign = () => useCampaignStore((state) => state.activeCampaign());
export const useCampaigns = () => useCampaignStore((state) => Object.values(state.campaigns));
export const useCampaignPhases = (campaignId: string) => 
  useCampaignStore((state) => state.campaigns[campaignId]?.phases);
