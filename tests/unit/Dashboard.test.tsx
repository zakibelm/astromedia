// tests/unit/Dashboard.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../../components/Dashboard';
import { TranslationProvider } from '../../i18n/TranslationContext';
import * as orchestrator from '../../services/orchestration/orchestrator';

// Mock de l'orchestrateur
vi.mock('../../services/orchestration/orchestrator', () => ({
  runPlaybookParallel: vi.fn(() => ({
    state: {},
    promise: Promise.resolve(),
    stop: vi.fn()
  })),
  getCampaignLogger: vi.fn(() => ({
    getCampaignMetrics: vi.fn(),
    getCampaignTimeline: vi.fn(() => [])
  }))
}));

// FIX: Cannot find namespace 'React'. Imported React.
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <TranslationProvider>
      {component}
    </TranslationProvider>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit afficher l\'état initial sans campagne', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/Votre équipe IA est prête/i)).toBeInTheDocument();
    expect(screen.getByText(/Créer une Nouvelle Campagne/i)).toBeInTheDocument();
  });

  it('doit ouvrir le modal de création de campagne', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    const createButton = screen.getByRole('button', { name: /Créer une Nouvelle Campagne/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/Lancer une Nouvelle Campagne/i)).toBeInTheDocument();
    });
  });

  it('doit lancer une campagne et appeler l\'orchestrateur', async () => {
    const user = userEvent.setup();
    const runPlaybookSpy = vi.mocked(orchestrator.runPlaybookParallel);
    
    renderWithProviders(<Dashboard />);

    // Ouvrir le modal
    const createButton = screen.getByRole('button', { name: /Nouvelle Campagne/i });
    await user.click(createButton);
    
    // Remplir le formulaire (juste assez pour passer)
    await user.type(screen.getByLabelText(/Nom du Projet/i), 'Project Astro');
    await user.type(screen.getByLabelText(/Nom de l'Entreprise/i), 'AstroMedia Inc.');
    
    // Aller à l'étape suivante
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    // Aller à l'étape suivante
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    // Aller à l'étape suivante
    await user.click(screen.getByRole('button', { name: /Suivant/i }));


    // Lancer la campagne
    const launchButton = screen.getByRole('button', { name: /Lancer la Campagne/i });
    await user.click(launchButton);

    await waitFor(() => {
      expect(runPlaybookSpy).toHaveBeenCalled();
      expect(runPlaybookSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: expect.stringMatching(/^campaign_/),
          state: expect.objectContaining({
            mode: 'semi_auto',
            statusByPhase: { briefing: 'completed' }
          })
        })
      );
    });
  });

  it('doit générer un ID de campagne unique', async () => {
    const user = userEvent.setup();
    const runPlaybookSpy = vi.mocked(orchestrator.runPlaybookParallel);
    
    renderWithProviders(<Dashboard />);

    const createButton = screen.getByRole('button', { name: /Nouvelle Campagne/i });
    await user.click(createButton);
        
    // Remplir le formulaire
    await user.type(screen.getByLabelText(/Nom du Projet/i), 'Project Astro');
    await user.type(screen.getByLabelText(/Nom de l'Entreprise/i), 'AstroMedia Inc.');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    
    const launchButton = screen.getByRole('button', { name: /Lancer la Campagne/i });
    await user.click(launchButton);

    await waitFor(() => {
      const call = runPlaybookSpy.mock.calls[0][0];
      expect(call.campaignId).toMatch(/^campaign_[a-f0-9-]+$/);
    });
  });

  it('doit afficher le contenu de la campagne active', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Dashboard />);

    const createButton = screen.getByRole('button', { name: /Nouvelle Campagne/i });
    await user.click(createButton);
    
    await user.type(screen.getByLabelText(/Nom du Projet/i), 'Project Astro');
    await user.type(screen.getByLabelText(/Nom de l'Entreprise/i), 'AstroMedia Inc.');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    
    const launchButton = screen.getByRole('button', { name: /Lancer la Campagne/i });
    await user.click(launchButton);

    await waitFor(() => {
      expect(screen.getByText(/Project Astro/i)).toBeInTheDocument();
      expect(screen.getByText(/Campagne pour AstroMedia Inc./i)).toBeInTheDocument();
    });
  });

  it('doit mapper correctement les modes de gouvernance', async () => {
    const user = userEvent.setup();
    const runPlaybookSpy = vi.mocked(orchestrator.runPlaybookParallel);
    
    renderWithProviders(<Dashboard />);

    const createButton = screen.getByRole('button', { name: /Nouvelle Campagne/i });
    await user.click(createButton);
    
    await user.type(screen.getByLabelText(/Nom du Projet/i), 'Project Astro');
    await user.type(screen.getByLabelText(/Nom de l'Entreprise/i), 'AstroMedia Inc.');
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    await user.click(screen.getByRole('button', { name: /Suivant/i }));
    
    const launchButton = screen.getByRole('button', { name: /Lancer la Campagne/i });
    await user.click(launchButton);

    await waitFor(() => {
      const call = runPlaybookSpy.mock.calls[0][0];
      // Le formulaire pré-rempli a governanceMode: 'semi-auto'
      expect(call.state.mode).toBe('semi_auto');
    });
  });
});