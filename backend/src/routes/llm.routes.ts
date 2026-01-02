import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const GenerateSchema = z.object({
    messages: z.array(z.object({
        role: z.string(), // Allowing 'user', 'assistant', 'system' etc.
        content: z.string()
    })),
    model: z.string(), // Allowing client to specify model (or validate against allowed list)
    criteria: z.enum(['cost', 'speed', 'quality', 'balanced']).optional(),
    responseMimeType: z.string().optional()
});

/**
 * POST /api/llm/generate
 * Secure proxy to OpenRouter/HF
 */
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { messages, model } = GenerateSchema.parse(req.body);

        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

        if (!OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.YOUR_SITE_URL || 'https://astromedia.ai',
                'X-Title': process.env.YOUR_SITE_NAME || 'AstroMedia'
            },
            body: JSON.stringify({
                model: model,
                messages,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', errorText);
            return res.status(response.status).json({ error: `Provider error: ${response.statusText}`, details: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        console.error('LLM Proxy Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
