// tests/unit/imageGenerator.test.ts
// FIX: Import 'afterAll' from 'vitest' to resolve the undefined error.
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { generateImage } from '../../services/imageGenerator';
import { GoogleGenAI } from '@google/genai';

// Mock complet du SDK
vi.mock('@google/genai', () => {
  const mockGenerateImages = vi.fn();
  const mockModels = { generateImages: mockGenerateImages };
  const mockGoogleGenAI = vi.fn(() => ({
    models: mockModels,
  }));
  return { GoogleGenAI: mockGoogleGenAI, mockGenerateImages };
});

const { mockGenerateImages } = await import('@google/genai');

describe('imageGenerator', () => {
  const originalApiKey = process.env.API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    // Assurer que la clé API est définie pour la plupart des tests
    process.env.API_KEY = 'test-key';
  });

  afterAll(() => {
    // Restaurer la clé API originale
    process.env.API_KEY = originalApiKey;
  });

  it('doit appeler generateImages et retourner une chaîne base64', async () => {
    const mockResponse = {
      generatedImages: [{ image: { imageBytes: 'dGVzdA==' } }]
    };
    mockGenerateImages.mockResolvedValue(mockResponse);

    const prompt = 'un chat robot';
    const result = await generateImage(prompt);

    expect(result).toBe('dGVzdA==');
    expect(mockGenerateImages).toHaveBeenCalledWith({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });
  });

  it('doit lever une erreur si l\'API ne retourne aucune image', async () => {
    mockGenerateImages.mockResolvedValue({ generatedImages: [] });

    await expect(generateImage('test')).rejects.toThrow('Image generation API returned no images.');
  });

  it('doit lever une erreur si l\'appel API échoue', async () => {
    const apiError = new Error('API Error 500');
    mockGenerateImages.mockRejectedValue(apiError);

    await expect(generateImage('test')).rejects.toThrow(`Failed to generate image: ${apiError.message}`);
  });

  it('doit lever une erreur si la clé API n\'est pas configurée', async () => {
    process.env.API_KEY = ''; // Simuler une clé API manquante

    // Re-importer le module pour qu'il lise la variable d'environnement mise à jour
    // C'est une astuce pour tester la logique au niveau du module
    const imageGeneratorModule = await import('../../services/imageGenerator?t=' + Date.now());

    await expect(imageGeneratorModule.generateImage('test')).rejects.toThrow('Cannot generate image: API_KEY is not configured.');
  });
});