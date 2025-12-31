// tests/unit/llmRouter.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import * as llmBandit from '../../services/llmBandit';

// Mock complet des dépendances au niveau supérieur
vi.mock('@google/genai');
vi.mock('../../services/llmBandit');

const mockedGoogleGenAI = vi.mocked(GoogleGenAI);
const mockGenerateContent = vi.fn();
mockedGoogleGenAI.mockReturnValue({
  models: {
    generateContent: mockGenerateContent,
  },
} as any);

const mockedPickBanditModel = vi.mocked(llmBandit.pickBanditModel);

describe('llmRouter', () => {
  const originalApiKey = process.env.API_KEY;

  afterAll(() => {
    // Restaurer l'environnement après tous les tests de ce fichier
    process.env.API_KEY = originalApiKey;
    vi.resetModules();
  });

  describe('lorsque API_KEY est configurée', () => {
    // Importer dynamiquement le module avec la clé API définie
    let runLLM: (typeof import('../../services/llmRouter'))['runLLM'];

    beforeAll(async () => {
      process.env.API_KEY = 'test-api-key';
      vi.resetModules(); // Forcer la ré-importation avec la nouvelle variable d'environnement
      const llmRouter = await import('../../services/llmRouter');
      runLLM = llmRouter.runLLM;
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockedPickBanditModel.mockReturnValue({
            provider: 'google',
            model: 'gemini-2.5-flash',
            cost: 1,
            speed: 1,
            quality: 0.9,
            useCases: ['default'],
        });
    });

    it('doit retourner une réponse réussie dans le format attendu', async () => {
      mockGenerateContent.mockResolvedValue({
        text: 'Ceci est une réponse réussie.',
      });

      const result = await runLLM({
        agent: 'test-agent',
        input: 'test input',
      });

      expect(result.success).toBe(true);
      expect(result.modelId).toBe('gemini-2.5-flash');
      expect(result.latency).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
      expect(result.response).toEqual({
        choices: [{
          message: {
            content: 'Ceci est une réponse réussie.',
          },
        }],
      });
      expect(mockGenerateContent).toHaveBeenCalledOnce();
    });

    it('doit gérer les erreurs de l\'API avec élégance', async () => {
      const apiError = new Error('La requête API a échoué');
      mockGenerateContent.mockRejectedValue(apiError);

      const result = await runLLM({
        agent: 'test-agent',
        input: 'test input',
      });

      expect(result.success).toBe(false);
      expect(result.modelId).toBe('gemini-2.5-flash');
      expect(result.response).toBeNull();
      expect(result.error).toBe(apiError);
    });

    it('doit passer systemInstruction et responseMimeType à l\'appel API', async () => {
        mockGenerateContent.mockResolvedValue({
            text: 'Réponse JSON',
        });
    
        await runLLM({
            agent: 'test-agent',
            input: 'test input',
            systemInstruction: 'Tu es un robot qui génère du JSON.',
            responseMimeType: 'application/json',
        });
    
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
            config: {
                responseMimeType: 'application/json',
                systemInstruction: 'Tu es un robot qui génère du JSON.',
            },
        }));
    });
  });

  describe('lorsque API_KEY n\'est PAS configurée', () => {
    let runLLM: (typeof import('../../services/llmRouter'))['runLLM'];
    
    beforeAll(async () => {
      process.env.API_KEY = '';
      vi.resetModules(); // Forcer la ré-importation avec la variable d'environnement vide
      const llmRouter = await import('../../services/llmRouter');
      runLLM = llmRouter.runLLM;
    });

    it('doit échouer rapidement sans appeler les services externes', async () => {
      const result = await runLLM({
        agent: 'test-agent',
        input: 'test input',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('API_KEY is not configured');
      // Vérifier qu'aucun appel réseau n'a été tenté
      expect(mockGenerateContent).not.toHaveBeenCalled();
      // Vérifier que la logique de sélection de modèle n'a pas été exécutée
      expect(mockedPickBanditModel).not.toHaveBeenCalled();
    });
  });
});