// tests/unit/AIAssistantWidget.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIAssistantWidget from '../../components/AIAssistantWidget';
import { TranslationProvider } from '../../i18n/TranslationContext';
import * as assistantService from '../../services/AIAssistantService';

// Mock du service
vi.mock('../../services/AIAssistantService', () => ({
  aiAssistantService: {
    getSuggestion: vi.fn(),
  },
}));
const mockedGetSuggestion = vi.mocked(assistantService.aiAssistantService.getSuggestion);

const renderWithProviders = (component: React.ReactElement) => {
  return render(<TranslationProvider>{component}</TranslationProvider>);
};

describe('AIAssistantWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetSuggestion.mockResolvedValue('Réponse IA de test');
  });

  it('affiche initialement seulement le bouton d\'ouverture', () => {
    renderWithProviders(<AIAssistantWidget />);
    expect(screen.getByRole('button', { name: /Ouvrir l'assistant IA/i })).toBeInTheDocument();
    expect(screen.queryByText(/Assistant IA/i)).not.toBeInTheDocument();
  });

  it('s\'ouvre et se ferme au clic sur le bouton', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIAssistantWidget />);

    // Ouvrir
    await user.click(screen.getByRole('button', { name: /Ouvrir l'assistant IA/i }));
    await waitFor(() => {
      expect(screen.getByText(/Assistant IA/i)).toBeInTheDocument();
    });

    // Fermer
    await user.click(screen.getByRole('button', { name: '×' }));
    await waitFor(() => {
      expect(screen.queryByText(/Assistant IA/i)).not.toBeInTheDocument();
    });
  });

  it('envoie une requête et affiche la réponse', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIAssistantWidget />);

    // Ouvrir le widget
    await user.click(screen.getByRole('button', { name: /Ouvrir l'assistant IA/i }));
    
    const input = screen.getByPlaceholderText(/Posez une question.../i);
    const sendButton = screen.getByRole('button', { name: /Envoyer/i });

    // Taper une question et envoyer
    await user.type(input, 'Ceci est un test');
    await user.click(sendButton);

    // Vérifier l'état de chargement
    expect(screen.getByText(/Réflexion en cours.../i)).toBeInTheDocument();
    expect(mockedGetSuggestion).toHaveBeenCalledWith('Ceci est un test', undefined, 'fr');

    // Vérifier que la réponse s'affiche
    await waitFor(() => {
      expect(screen.getByText('Réponse IA de test')).toBeInTheDocument();
    });
  });

  it('envoie une requête avec l\'agent spécialiste sélectionné', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AIAssistantWidget />);

    // Ouvrir le widget
    await user.click(screen.getByRole('button', { name: /Ouvrir l'assistant IA/i }));

    // Sélectionner un agent
    await user.selectOptions(screen.getByLabelText(/Consulter un spécialiste/i), 'CMO');
    
    const input = screen.getByPlaceholderText(/Posez une question.../i);
    const sendButton = screen.getByRole('button', { name: /Envoyer/i });

    await user.type(input, 'Test CMO');
    await user.click(sendButton);

    expect(mockedGetSuggestion).toHaveBeenCalledWith('Test CMO', 'CMO', 'fr');
  });
});
