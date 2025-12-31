import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPlaybookParallel } from '../../services/orchestration/orchestrator';
import { CampaignState, CampaignPlaybook, Phase } from '../../services/orchestration/types';
import * as agentRunner from '../../services/agentRunner';
import { z } from 'zod';

// Mock de runAgent
vi.mock('../../services/agentRunner', () => ({
  runAgent: vi.fn(),
}));

describe('Orchestrator: runPlaybookParallel', () => {
  // Use a mutable playbook to allow modification in specific tests
  let mockPlaybook: CampaignPlaybook;

  beforeEach(() => {
    vi.mocked(agentRunner.runAgent).mockClear();
    mockPlaybook = {
      phases: [
        {
          id: 'briefing', titleKey: 'test.briefing', descriptionKey: 'test.desc',
          agent: 'Human', inputs: ['brandProfile'], outputs: ['briefContext'],
          validation: 'required' as const,
        },
        {
          id: 'strategy', titleKey: 'test.strategy', descriptionKey: 'test.desc',
          agent: 'CMO', inputs: ['briefContext'], outputs: ['strategyBrief'],
          dependsOn: ['briefing'], validation: 'optional' as const,
        },
        {
          id: 'seo', titleKey: 'test.seo', descriptionKey: 'test.desc',
          agent: 'SEO', inputs: ['strategyBrief'], outputs: ['keywords'],
          dependsOn: ['strategy'], validation: 'optional' as const,
        }
      ],
    };
  });

  it('ne doit pas lancer une phase avant que ses dépendances soient complètes', async () => {
    const mockState: CampaignState = {
      mode: 'auto', statusByPhase: { briefing: 'running' }, // Not completed
      triesByPhase: {}, awaitingHumanApproval: new Set(),
      context: { brandProfile: 'Test Brand' },
    };
    
    let orchestrator;
    try {
      orchestrator = runPlaybookParallel({
        playbook: mockPlaybook, state: mockState, campaignId: 'test-2',
      });
      await new Promise(r => setTimeout(r, 50));
      
      expect(mockState.statusByPhase['strategy']).toBeUndefined(); 
      expect(agentRunner.runAgent).not.toHaveBeenCalled();
    } finally {
      orchestrator?.stop();
    }
  });

  it('doit respecter la limite de concurrence lorsque plusieurs phases sont prêtes en parallèle', async () => {
    const parallelPlaybook: CampaignPlaybook = {
      phases: [
        { id: 'briefing', agent: 'Human', inputs: [], outputs: ['brief'], validation: 'required', titleKey: 'a', descriptionKey: 'b' },
        { id: 'phaseA', agent: 'AgentA', inputs: ['brief'], outputs: [], dependsOn: ['briefing'], validation: 'optional', titleKey: 'a', descriptionKey: 'b' },
        { id: 'phaseB', agent: 'AgentB', inputs: ['brief'], outputs: [], dependsOn: ['briefing'], validation: 'optional', titleKey: 'a', descriptionKey: 'b' },
        { id: 'phaseC', agent: 'AgentC', inputs: ['brief'], outputs: [], dependsOn: ['briefing'], validation: 'optional', titleKey: 'a', descriptionKey: 'b' },
        { id: 'phaseD', agent: 'AgentD', inputs: ['brief'], outputs: [], dependsOn: ['briefing'], validation: 'optional', titleKey: 'a', descriptionKey: 'b' },
      ],
    };

    const mockState: CampaignState = {
      mode: 'auto',
      statusByPhase: { briefing: 'completed' },
      triesByPhase: {}, awaitingHumanApproval: new Set(),
      context: { brief: 'start' },
    };

    let concurrentCount = 0;
    let maxConcurrent = 0;

    vi.mocked(agentRunner.runAgent).mockImplementation(async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise(resolve => setTimeout(resolve, 50));
      concurrentCount--;
      return {};
    });

    let orchestrator;
    try {
      orchestrator = runPlaybookParallel({
        playbook: parallelPlaybook, state: mockState,
        campaignId: 'concurrency-test', concurrency: 2,
      });
      await orchestrator.promise;
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    } finally {
      orchestrator?.stop();
    }
  });

  it('doit réessayer une phase en cas d\'échec jusqu\'à maxRetries', async () => {
    const mockState: CampaignState = {
      mode: 'auto', statusByPhase: { briefing: 'completed' },
      triesByPhase: {}, awaitingHumanApproval: new Set(),
      context: { briefContext: 'Done' },
    };
    
    vi.mocked(agentRunner.runAgent)
      .mockRejectedValueOnce(new Error('Timeout 1'))
      .mockRejectedValueOnce(new Error('Timeout 2'))
      .mockResolvedValueOnce({ strategyBrief: 'Success' });
    
    const strategyPhase = mockPlaybook.phases.find(p => p.id === 'strategy');
    if (strategyPhase) strategyPhase.maxRetries = 2;

    let orchestrator;
    try {
        orchestrator = runPlaybookParallel({ playbook: mockPlaybook, state: mockState, campaignId: 'test-retry' });
        await orchestrator.promise;
        
        expect(agentRunner.runAgent).toHaveBeenCalledTimes(3);
        expect(mockState.statusByPhase['strategy']).toBe('completed');
    } finally {
        orchestrator?.stop();
    }
  });

  it('doit échouer une phase si la validation Zod échoue', async () => {
    const validators = {
      strategy: z.object({ strategyBrief: z.string().min(10) })
    };
    
    vi.mocked(agentRunner.runAgent).mockResolvedValue({ strategyBrief: 'short' });

    const mockState: CampaignState = {
        mode: 'auto', statusByPhase: { briefing: 'completed' },
        triesByPhase: {}, awaitingHumanApproval: new Set(),
        context: { briefContext: 'Done' },
    };

    let orchestrator;
    try {
        orchestrator = runPlaybookParallel({ 
            playbook: mockPlaybook, state: mockState, 
            campaignId: 'test-validation', validators 
        });
        await orchestrator.promise;
        expect(mockState.statusByPhase['strategy']).toBe('failed');
    } finally {
        orchestrator?.stop();
    }
  });

  it('doit marquer une phase comme échouée après un timeout', async () => {
    vi.mocked(agentRunner.runAgent).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ strategyBrief: 'Late response' }), 100))
    );
    
    const strategyPhase = mockPlaybook.phases.find(p => p.id === 'strategy');
    if (strategyPhase) strategyPhase.timeoutMs = 50;

    const mockState: CampaignState = {
        mode: 'auto', statusByPhase: { briefing: 'completed' },
        triesByPhase: {}, awaitingHumanApproval: new Set(),
        context: { briefContext: 'Done' },
    };
    
    let orchestrator;
    try {
        orchestrator = runPlaybookParallel({ playbook: mockPlaybook, state: mockState, campaignId: 'test-timeout' });
        await orchestrator.promise;
        expect(mockState.statusByPhase['strategy']).toBe('failed');
    } finally {
        orchestrator?.stop();
    }
  });
});