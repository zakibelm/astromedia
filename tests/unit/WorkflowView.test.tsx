// tests/unit/WorkflowView.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkflowView from '../../components/WorkflowView';
import { getCampaignLogger } from '../../services/orchestration/orchestrator';
import { TranslationProvider } from '../../i18n/TranslationContext';

// Mock du logger pour contrôler les données des événements
vi.mock('../../services/orchestration/orchestrator', () => ({
  getCampaignLogger: vi.fn(),
}));
const mockedGetCampaignLogger = vi.mocked(getCampaignLogger);

const renderWithProviders = (component: React.ReactElement) => {
  return render(<TranslationProvider>{component}</TranslationProvider>);
};

describe('WorkflowView', () => {
  const mockOnApprove = vi.fn();
  const mockOnReject = vi.fn();
  const campaignId = 'test-campaign-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('affiche correctement les phases du playbook et leurs statuts', () => {
    mockedGetCampaignLogger.mockReturnValue({
      getCampaignTimeline: vi.fn(() => [
        { phaseId: 'research', status: 'completed', timestamp: Date.now() },
        { phaseId: 'strategy', status: 'running', timestamp: Date.now() },
      ]),
    } as any);

    renderWithProviders(
      <WorkflowView
        workflowStatus={{ research: 'completed', strategy: 'running' }}
        campaignId={campaignId}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );
    
    // Avancer les timers pour déclencher l'intervalle de useEffect
    vi.advanceTimersByTime(500);

    expect(screen.getByText('Recherche & Benchmark')).toBeInTheDocument();
    expect(screen.getByText(/Terminée/i)).toBeInTheDocument();
    expect(screen.getByText('Stratégie Marketing')).toBeInTheDocument();
    expect(screen.getByText(/En cours/i)).toBeInTheDocument();
    expect(screen.queryByText('Briefing Stratégique')).not.toBeInTheDocument(); // Doit être caché
  });

  it('affiche le payload des slides d\'analyse avec une mise en page par défaut', () => {
    const slidesPayload = {
      slides: [
        { title: 'Analyse Concurrentielle', layout: 'default', content: ['Concurrent A est fort', 'Concurrent B est faible'] }
      ]
    };
    mockedGetCampaignLogger.mockReturnValue({
      getCampaignTimeline: vi.fn(() => [
        { phaseId: 'research', status: 'completed', payload: slidesPayload, timestamp: Date.now() },
      ]),
    } as any);

    renderWithProviders(
      <WorkflowView workflowStatus={{}} campaignId={campaignId} onApprove={mockOnApprove} onReject={mockOnReject} />
    );
    vi.advanceTimersByTime(500);

    expect(screen.getByText('Analyse Concurrentielle')).toBeInTheDocument();
    expect(screen.getByText('Concurrent A est fort')).toBeInTheDocument();
    expect(screen.getByText('Concurrent B est faible')).toBeInTheDocument();
  });

  it('affiche le payload des slides d\'analyse avec une mise en page spéciale pour la grille SWOT', () => {
    const swotPayload = {
      slides: [
        { title: 'Analyse SWOT', layout: 'swot_grid', content: ['Marque forte', 'Coût élevé', 'Nouveau marché', 'Gros concurrents'] }
      ]
    };
    mockedGetCampaignLogger.mockReturnValue({
      getCampaignTimeline: vi.fn(() => [
        { phaseId: 'research', status: 'completed', payload: swotPayload, timestamp: Date.now() },
      ]),
    } as any);

    renderWithProviders(
      <WorkflowView workflowStatus={{}} campaignId={campaignId} onApprove={mockOnApprove} onReject={mockOnReject} />
    );
    vi.advanceTimersByTime(500);

    expect(screen.getByText('Analyse SWOT')).toBeInTheDocument();
    // Vérifier les libellés SWOT traduits
    expect(screen.getByText('Forces')).toBeInTheDocument();
    expect(screen.getByText('Faiblesses')).toBeInTheDocument();
    expect(screen.getByText('Opportunités')).toBeInTheDocument();
    expect(screen.getByText('Menaces')).toBeInTheDocument();
    // Vérifier le contenu
    expect(screen.getByText('Marque forte')).toBeInTheDocument();
    expect(screen.getByText('Nouveau marché')).toBeInTheDocument();
  });

  it('affiche les boutons approuver/rejeter pour les phases en attente de validation', () => {
    mockedGetCampaignLogger.mockReturnValue({
      getCampaignTimeline: vi.fn(() => [
        { phaseId: 'strategy', status: 'waitingValidation', payload: { summary: 'Un plan' }, timestamp: Date.now() },
      ]),
    } as any);

    renderWithProviders(
      <WorkflowView workflowStatus={{ strategy: 'waitingValidation' }} campaignId={campaignId} onApprove={mockOnApprove} onReject={mockOnReject} />
    );
    vi.advanceTimersByTime(500);
    
    expect(screen.getByRole('button', { name: /Approuver/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rejeter/i })).toBeInTheDocument();
  });

  it('appelle onApprove lorsque le bouton approuver est cliqué', async () => {
    const user = userEvent.setup();
    mockedGetCampaignLogger.mockReturnValue({
      getCampaignTimeline: vi.fn(() => [
        { phaseId: 'strategy', status: 'waitingValidation', payload: { summary: 'Un plan' }, timestamp: Date.now() },
      ]),
    } as any);

    renderWithProviders(
      <WorkflowView workflowStatus={{ strategy: 'waitingValidation' }} campaignId={campaignId} onApprove={mockOnApprove} onReject={mockOnReject} />
    );
    vi.advanceTimersByTime(500);

    await user.click(screen.getByRole('button', { name: /Approuver/i }));
    expect(mockOnApprove).toHaveBeenCalledWith('strategy');
  });
});
