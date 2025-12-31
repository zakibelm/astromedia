// tests/unit/AIAssistantService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiAssistantService } from '../../services/AIAssistantService';
import * as llmRouter from '../../services/llmRouter';
import { agentBrains } from '../../services/agentBrains';

vi.mock('../../services/llmRouter');
const mockedRunLLM = vi.mocked(llmRouter.runLLM);

describe('AIAssistantService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRunLLM.mockResolvedValue({
      response: { choices: [{ message: { content: 'Réponse IA simulée' } }] },
      modelId: 'test-model',
      latency: 100,
      success: true,
    });
  });

  it('doit appeler runLLM avec le prompt système par défaut en français', async () => {
    const response = await aiAssistantService.getSuggestion('Bonjour', undefined, 'fr');

    expect(response).toBe('Réponse IA simulée');
    expect(mockedRunLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("Vous êtes un assistant IA, expert en marketing. Vous devez répondre en français."),
        input: 'Bonjour',
      })
    );
  });

  it('doit appeler runLLM avec le prompt système par défaut en anglais', async () => {
    await aiAssistantService.getSuggestion('Hello', undefined, 'en');
    
    expect(mockedRunLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.stringContaining("You are an AI assistant and marketing expert. You must respond in English."),
        input: 'Hello',
      })
    );
  });

  it('doit utiliser la persona d\'un agent spécifique si un agentId est fourni', async () => {
    const cmoBrain = agentBrains['CMO'];
    await aiAssistantService.getSuggestion('Planifie une campagne', 'CMO', 'fr');

    expect(mockedRunLLM).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'CMO',
        systemInstruction: expect.stringContaining(`Tu es un expert IA agissant en tant que "${cmoBrain.title}"`),
      })
    );
  });

  it('doit gérer correctement les échecs de l\'appel LLM', async () => {
    mockedRunLLM.mockResolvedValue({
      response: null,
      modelId: 'test-model',
      latency: 100,
      success: false,
      error: new Error('API Error'),
    });

    const response = await aiAssistantService.getSuggestion('test', undefined, 'fr');
    expect(response).toBe("Désolé, j'ai rencontré un problème lors du traitement de votre demande.");
  });

  it('doit gérer le contenu vide de la réponse LLM', async () => {
    mockedRunLLM.mockResolvedValue({
      response: { choices: [{ message: { content: '  ' } }] }, // Contenu vide
      modelId: 'test-model',
      latency: 100,
      success: true,
    });

    const response = await aiAssistantService.getSuggestion('test', undefined, 'fr');
    expect(response).toBe("Désolé, j'ai rencontré un problème lors du traitement de votre demande.");
  });
});
