// ... imports
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_CONFIG } from '../constants/index';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

// Rate limiting
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many requests. Please try again later.' }
});

const imageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: { error: 'Too many image generation requests. Please try again later.' }
});

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post('/api/gemini', chatLimiter, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    const contents = history && Array.isArray(history) && history.length > 0
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    const tools = {
        functionDeclarations: GEMINI_CONFIG.TOOLS.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters as any
        }))
    };

    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.MODEL_NAMES.FLASH,
      contents,
      config: {
        systemInstruction: GEMINI_CONFIG.SYSTEM_INSTRUCTION,
        tools: [tools]
      }
    });

    const text = response.text || '';
    const toolCalls = response.functionCalls;

    res.json({ text, toolCalls });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      error: 'AI service error',
      message: error.message
    });
  }
});

// Image generation endpoint
app.post('/api/gemini-image', imageLimiter, async (req, res) => {
  try {
    const { theme } = req.body;

    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    if (theme.length > 200) {
      return res.status(400).json({ error: 'Theme description too long' });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.MODEL_NAMES.IMAGE,
      contents: {
        parts: [{
          text: `Create a professional and serene wallpaper background with a theme of: ${theme}.

STRICT GUIDELINES:
1. CONTENT: Must be strictly beautiful, peaceful, and inspiring.
2. STYLE: High-quality minimalist digital art, cinematic lighting.
3. COMPOSITION: NO text in the image. NO human faces.`
        }]
      },
      config: {
        // @ts-ignore - imageConfig not strictly typed in all SDK versions yet
        imageConfig: {
            aspectRatio: "1:1"
        }
      }
    });

    const candidates = response.candidates;
    console.log('🖼️ Image Gen Response Candidates:', JSON.stringify(candidates, null, 2));

    if (candidates && candidates.length > 0) {
      const parts = candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            return res.json({
              image: `data:image/png;base64,${part.inlineData.data}`
            });
          }
        }
      }

      // If we got here, we have candidates but no image. Check for text rejection.
      const textPart = parts?.find(p => p.text)?.text;
      if (textPart) {
          console.warn('⚠️ Model returned text instead of image:', textPart);
          return res.status(400).json({ error: `Model refused to generate image: ${textPart}` });
      }
    }

    res.status(500).json({ error: 'Failed to generate image. No candidates returned.' });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({
      error: 'Image generation service error',
      message: error.message
    });
  }
});

// Export app for Vercel
export default app;

// Only listen if running locally (not in Vercel environment)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Gemini Proxy Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
  });
}
