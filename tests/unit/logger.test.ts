import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCampaignLogger } from '../../services/orchestration/orchestrator';

describe('CampaignLogger', () => {
  let logger: ReturnType<typeof getCampaignLogger>;
  const campaignId = 'test-campaign-123';

  beforeEach(() => {
    logger = getCampaignLogger();
    // Clear les logs pour isolation des tests
    (logger as any).logs.clear();
  });

  describe('logPhase', () => {
    it('doit ajouter un événement avec un timestamp', () => {
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'running' });
      
      const timeline = logger.getCampaignTimeline(campaignId);
      
      expect(timeline).toHaveLength(1);
      expect(timeline[0]).toMatchObject({
        phaseId: 'strategy',
        status: 'running',
      });
      expect(timeline[0].timestamp).toBeTypeOf('number');
      expect(timeline[0].timestamp).toBeGreaterThan(Date.now() - 1000);
    });

    it('doit supporter plusieurs événements pour la même campagne', () => {
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'running' });
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'completed', latency: 1500 });
      logger.logPhase(campaignId, { phaseId: 'seo', status: 'running' });
      
      const timeline = logger.getCampaignTimeline(campaignId);
      
      expect(timeline).toHaveLength(3);
      expect(timeline[1].latency).toBe(1500);
    });

    it('doit isoler les logs entre différentes campagnes', () => {
      const campaign1 = 'campaign-1';
      const campaign2 = 'campaign-2';
      
      logger.logPhase(campaign1, { phaseId: 'strategy', status: 'running' });
      logger.logPhase(campaign2, { phaseId: 'seo', status: 'running' });
      
      expect(logger.getCampaignTimeline(campaign1)).toHaveLength(1);
      expect(logger.getCampaignTimeline(campaign2)).toHaveLength(1);
      expect(logger.getCampaignTimeline(campaign1)[0].phaseId).toBe('strategy');
      expect(logger.getCampaignTimeline(campaign2)[0].phaseId).toBe('seo');
    });

    it('doit respecter la limite MAX_CAMPAIGNS', () => {
      const MAX_CAMPAIGNS = 50;
      
      // Créer 51 campagnes
      for (let i = 0; i < MAX_CAMPAIGNS + 1; i++) {
        logger.logPhase(`campaign-${i}`, { phaseId: 'test', status: 'running' });
      }
      
      // La première campagne doit avoir été évincée
      expect(logger.getCampaignTimeline('campaign-0')).toHaveLength(0);
      expect(logger.getCampaignTimeline('campaign-50')).toHaveLength(1);
      expect((logger as any).logs.size).toBe(MAX_CAMPAIGNS);
    });
  });

  describe('getCampaignMetrics', () => {
    it('doit retourner des métriques vides pour une campagne sans événements', () => {
      const metrics = logger.getCampaignMetrics('non-existent');
      
      expect(metrics).toEqual({
        totalPhases: 0,
        completed: 0,
        failed: 0,
        avgLatency: 0,
        totalDuration: 0,
      });
    });

    it('doit calculer correctement les métriques', () => {
      const startTime = Date.now();
      // FIX: Cannot find name 'vi'.
      vi.useFakeTimers();
      // FIX: Cannot find name 'vi'.
      vi.setSystemTime(startTime);
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'running' });
      // FIX: Cannot find name 'vi'.
      vi.setSystemTime(startTime + 1000);
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'completed', latency: 1000 });
      // FIX: Cannot find name 'vi'.
      vi.setSystemTime(startTime + 1100);
      logger.logPhase(campaignId, { phaseId: 'seo', status: 'running' });
      // FIX: Cannot find name 'vi'.
      vi.setSystemTime(startTime + 3100);
      logger.logPhase(campaignId, { phaseId: 'seo', status: 'completed', latency: 2000 });
      // FIX: Cannot find name 'vi'.
      vi.setSystemTime(startTime + 3200);
      logger.logPhase(campaignId, { phaseId: 'copy', status: 'running' });
      // FIX: Cannot find name 'vi'.
      vi.setSystemTime(startTime + 3700);
      logger.logPhase(campaignId, { phaseId: 'copy', status: 'failed', latency: 500, error: 'Timeout' });
      
      const metrics = logger.getCampaignMetrics(campaignId);
      
      expect(metrics.totalPhases).toBe(3);
      expect(metrics.completed).toBe(2);
      expect(metrics.failed).toBe(1);
      expect(metrics.avgLatency).toBe(1500); // (1000 + 2000) / 2
      expect(metrics.totalDuration).toBe(3700);

      // FIX: Cannot find name 'vi'.
      vi.useRealTimers();
    });

    it('doit dédupliquer les phases multiples dans le comptage', () => {
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'running' });
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'completed', latency: 1000 });
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'running' }); // Retry
      logger.logPhase(campaignId, { phaseId: 'strategy', status: 'completed', latency: 800 });
      
      const metrics = logger.getCampaignMetrics(campaignId);
      
      expect(metrics.totalPhases).toBe(1);
      expect(metrics.completed).toBe(1);
      expect(metrics.avgLatency).toBe(900); // (1000 + 800) / 2
    });
  });

  describe('Singleton Pattern', () => {
    it('doit retourner la même instance', () => {
      const logger1 = getCampaignLogger();
      const logger2 = getCampaignLogger();
      
      expect(logger1).toBe(logger2);
    });

    it('doit partager l\'état entre les instances', () => {
      const logger1 = getCampaignLogger();
      const logger2 = getCampaignLogger();
      
      logger1.logPhase(campaignId, { phaseId: 'test', status: 'running' });
      
      expect(logger2.getCampaignTimeline(campaignId)).toHaveLength(1);
    });
  });
});