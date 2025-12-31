// tests/integration/campaignFlow.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../App';
import * as orchestrator from '../../services/orchestration/orchestrator';

// Mock the entire orchestrator module
vi.mock('../../services/orchestration/orchestrator', async (importOriginal) => {
    // FIX: Corrected the importOriginal call to use type casting as it does not support generic type arguments.
    const original = await importOriginal() as typeof orchestrator;
    return {
        ...original,
        runPlaybookParallel: vi.fn(() => ({
            state: {},
            promise: Promise.resolve(),
            stop: vi.fn(),
        })),
        getCampaignLogger: vi.fn(() => ({
            getCampaignTimeline: vi.fn(() => []),
            getCampaignMetrics: vi.fn(() => ({
                totalPhases: 0,
                completed: 0,
                failed: 0,
                avgLatency: 0,
                totalDuration: 0,
            })),
        })),
    };
});

describe('Full Campaign Flow Integration Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should allow a user to create and launch a new campaign', async () => {
        const user = userEvent.setup();
        const runPlaybookSpy = vi.spyOn(orchestrator, 'runPlaybookParallel');

        render(<App />);

        // 1. Start from Landing Page
        expect(screen.getByText(/Orchestrez Votre Marketing avec une Équipe IA/i)).toBeInTheDocument();
        const startButton = screen.getByRole('button', { name: /Lancer le tableau de bord/i });
        await user.click(startButton);

        // 2. Arrive at Dashboard - No campaign state
        await waitFor(() => {
            expect(screen.getByText(/Votre équipe IA est prête/i)).toBeInTheDocument();
        });
        const newCampaignButton = screen.getByRole('button', { name: /Créer une Nouvelle Campagne/i });

        // 3. Open New Campaign Modal
        await user.click(newCampaignButton);
        await waitFor(() => {
            expect(screen.getByText(/Lancer une Nouvelle Campagne/i)).toBeInTheDocument();
        });

        // 4. Fill out the multi-step form
        // Step 1
        await user.type(screen.getByLabelText(/Nom du Projet/i), 'Projet Intégration Test');
        await user.type(screen.getByLabelText(/Nom de l'Entreprise/i), 'TestCorp');
        await user.type(screen.getByLabelText(/Secteur d'Activité/i), 'Testing');
        await user.click(screen.getByRole('button', { name: /Suivant/i }));

        // Step 2
        await waitFor(() => {
            expect(screen.getByText(/Objectifs de la Campagne/i)).toBeInTheDocument();
        });
        await user.click(screen.getByLabelText(/Notoriété/i));
        await user.type(screen.getByLabelText(/Audience Cible/i), 'Testeurs exigeants');
        await user.click(screen.getByRole('button', { name: /Suivant/i }));

        // Step 3
        await waitFor(() => {
            expect(screen.getByText(/Identité de Marque/i)).toBeInTheDocument();
        });
        await user.click(screen.getByLabelText(/LinkedIn/i));
        await user.type(screen.getByLabelText(/Ton de la Marque/i), 'Professionnel et précis');
        await user.type(screen.getByLabelText(/Valeurs de la Marque/i), 'Qualité, Fiabilité');

        // 5. Launch the campaign
        const launchButton = screen.getByRole('button', { name: /Lancer la Campagne/i });
        await user.click(launchButton);

        // 6. Verify orchestrator was called
        await waitFor(() => {
            expect(runPlaybookSpy).toHaveBeenCalledOnce();
            expect(runPlaybookSpy).toHaveBeenCalledWith(expect.objectContaining({
                state: expect.objectContaining({
                    context: expect.objectContaining({
                        projectName: 'Projet Intégration Test',
                        companyInfo: expect.objectContaining({ name: 'TestCorp' }),
                        campaignGoals: expect.objectContaining({ objectives: ['notoriety'] }),
                    })
                })
            }));
        });

        // 7. Verify the ActiveCampaignView is displayed
        await waitFor(() => {
            expect(screen.queryByText(/Lancer une Nouvelle Campagne/i)).not.toBeInTheDocument(); // Modal is closed
            expect(screen.getByText('Projet Intégration Test')).toBeInTheDocument();
            expect(screen.getByText(/Campagne pour TestCorp/i)).toBeInTheDocument();
            expect(screen.getByText(/Flux de travail/i)).toBeInTheDocument(); // Workflow tab is visible
        });
    });
});