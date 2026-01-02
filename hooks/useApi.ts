// React Query Hooks and API Client
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

// API Base URL
const API_BASE = '/api/v1';

// Query Keys Factory
export const queryKeys = {
  all: ['astromedia'] as const,
  
  // Campaigns
  campaigns: () => [...queryKeys.all, 'campaigns'] as const,
  campaign: (id: string) => [...queryKeys.campaigns(), id] as const,
  campaignPhases: (id: string) => [...queryKeys.campaign(id), 'phases'] as const,
  campaignAssets: (id: string) => [...queryKeys.campaign(id), 'assets'] as const,
  
  // Users
  users: () => [...queryKeys.all, 'users'] as const,
  user: (id: string) => [...queryKeys.users(), id] as const,
  currentUser: () => [...queryKeys.users(), 'me'] as const,
  
  // Assets
  assets: () => [...queryKeys.all, 'assets'] as const,
  asset: (id: string) => [...queryKeys.assets(), id] as const,
  
  // Agents
  agents: () => [...queryKeys.all, 'agents'] as const,
  agentMetrics: () => [...queryKeys.agents(), 'metrics'] as const,
  
  // Analytics
  analytics: () => [...queryKeys.all, 'analytics'] as const,
  usageStats: () => [...queryKeys.analytics(), 'usage'] as const,
  costBreakdown: () => [...queryKeys.analytics(), 'costs'] as const,
};

// Type-safe API Error
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Base fetch function with auth and error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const csrfToken = useAuthStore.getState().csrfToken;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add CSRF token for mutations
  if (csrfToken && options.method && !['GET', 'HEAD'].includes(options.method)) {
    (headers as Record<string, string>)['x-csrf-token'] = csrfToken;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 - attempt token refresh
  if (response.status === 401) {
    const refreshed = await useAuthStore.getState().refreshToken();
    if (refreshed) {
      // Retry the request
      return apiFetch<T>(endpoint, options);
    }
    throw new ApiError('Session expired', 401, 'SESSION_EXPIRED');
  }

  if (!response.ok) {
    let errorData: { message?: string; code?: string; details?: Record<string, unknown> } = {};
    try {
      errorData = await response.json();
    } catch {
      // Response might not be JSON
    }
    throw new ApiError(
      errorData.message || `Request failed: ${response.statusText}`,
      response.status,
      errorData.code,
      errorData.details
    );
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) return {} as T;
  
  return JSON.parse(text);
}

// ============================================
// Campaign Hooks
// ============================================

export interface Campaign {
  id: string;
  name: string;
  status: string;
  briefData: Record<string, unknown>;
  createdAt: string;
  totalCost: number;
}

export function useCampaigns(options?: UseQueryOptions<Campaign[], ApiError>) {
  return useQuery({
    queryKey: queryKeys.campaigns(),
    queryFn: () => apiFetch<{ campaigns: Campaign[] }>('/campaigns').then(r => r.campaigns),
    staleTime: 30000, // 30 seconds
    ...options,
  });
}

export function useCampaign(id: string, options?: UseQueryOptions<Campaign, ApiError>) {
  return useQuery({
    queryKey: queryKeys.campaign(id),
    queryFn: () => apiFetch<Campaign>(`/campaigns/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useCreateCampaign(
  options?: UseMutationOptions<Campaign, ApiError, Partial<Campaign>>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiFetch<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (newCampaign) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns() });
      queryClient.setQueryData(queryKeys.campaign(newCampaign.id), newCampaign);
    },
    ...options,
  });
}

export function useUpdateCampaign(
  options?: UseMutationOptions<Campaign, ApiError, { id: string; data: Partial<Campaign> }>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => apiFetch<Campaign>(`/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(queryKeys.campaign(updatedCampaign.id), updatedCampaign);
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns() });
    },
    ...options,
  });
}

export function useDeleteCampaign(
  options?: UseMutationOptions<void, ApiError, string>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => apiFetch<void>(`/campaigns/${id}`, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.campaign(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns() });
    },
    ...options,
  });
}

// ============================================
// Asset Generation Hooks
// ============================================

export interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:5';
  style?: 'artistic' | 'photorealistic';
  campaignId?: string;
}

export interface GeneratedImage {
  url: string;
  provider: string;
  model: string;
  cost?: number;
}

export function useGenerateImage(
  options?: UseMutationOptions<{ images: GeneratedImage[] }, ApiError, GenerateImageParams>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => apiFetch<{ images: GeneratedImage[] }>('/assets/generate-image', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
    onSuccess: (_, variables) => {
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignAssets(variables.campaignId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.usageStats() });
    },
    ...options,
  });
}

export interface GenerateVideoParams {
  prompt: string;
  inputImage?: string;
  duration?: number;
  style?: 'cinematic' | 'dynamic';
  campaignId?: string;
}

export interface GeneratedVideo {
  url: string;
  provider: string;
  model: string;
  duration: number;
  cost?: number;
  jobId?: string;
}

export function useGenerateVideo(
  options?: UseMutationOptions<{ video: GeneratedVideo }, ApiError, GenerateVideoParams>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => apiFetch<{ video: GeneratedVideo }>('/assets/generate-video', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
    onSuccess: (_, variables) => {
      if (variables.campaignId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignAssets(variables.campaignId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.usageStats() });
    },
    ...options,
  });
}

// ============================================
// Analytics Hooks
// ============================================

export interface UsageStats {
  totalCalls: number;
  totalCost: number;
  callsByProvider: Record<string, number>;
  costByProvider: Record<string, number>;
  dailyUsage: Array<{ date: string; calls: number; cost: number }>;
}

export function useUsageStats(options?: UseQueryOptions<UsageStats, ApiError>) {
  return useQuery({
    queryKey: queryKeys.usageStats(),
    queryFn: () => apiFetch<UsageStats>('/analytics/usage'),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refetch every 5 minutes
    ...options,
  });
}

export interface AgentMetrics {
  agentType: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number;
}

export function useAgentMetrics(options?: UseQueryOptions<AgentMetrics[], ApiError>) {
  return useQuery({
    queryKey: queryKeys.agentMetrics(),
    queryFn: () => apiFetch<{ metrics: AgentMetrics[] }>('/agents/metrics').then(r => r.metrics),
    staleTime: 30000,
    ...options,
  });
}

// ============================================
// LLM Hooks
// ============================================

export interface LLMGenerateParams {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  criteria?: 'cost' | 'speed' | 'quality' | 'balanced';
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed: number;
  cost: number;
}

export function useLLMGenerate(
  options?: UseMutationOptions<LLMResponse, ApiError, LLMGenerateParams>
) {
  return useMutation({
    mutationFn: (params) => apiFetch<LLMResponse>('/llm/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
    ...options,
  });
}

// ============================================
// Optimistic Updates Helper
// ============================================

export function useOptimisticUpdate<T>(
  queryKey: readonly unknown[],
  updateFn: (old: T | undefined, newData: Partial<T>) => T
) {
  const queryClient = useQueryClient();

  return {
    onMutate: async (newData: Partial<T>) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<T>(queryKey);
      
      if (previousData) {
        queryClient.setQueryData<T>(queryKey, updateFn(previousData, newData));
      }
      
      return { previousData };
    },
    onError: (_err: Error, _newData: Partial<T>, context: { previousData?: T } | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

// ============================================
// Query Client Provider Setup
// ============================================

export { apiFetch };
