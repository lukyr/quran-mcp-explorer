// ... imports
import 'dotenv/config';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_CONFIG } from '../constants/index';
import { rateLimiter, apiRateLimiter } from './middleware/rateLimiter';
import { allowGoodBots } from './middleware/botDetection';
import { securityHeaders } from './middleware/securityHeaders';
import { requestLogger } from './middleware/requestLogger';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.local') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '' });

// Security Middleware (order matters!)
app.use(requestLogger); // Log all requests first
app.use(securityHeaders); // Add security headers
app.use(allowGoodBots); // Block bad bots, allow good ones
app.use(rateLimiter); // General rate limiting

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://sahabatquran.fun',
      'https://www.sahabatquran.fun'
    ];

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // Limit payload size

// Health check
app.get('/health', (_: express.Request, res: express.Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint with API rate limiting
app.post('/api/gemini', apiRateLimiter, async (req: express.Request, res: express.Response) => {
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
app.post('/api/gemini-image', apiRateLimiter, async (req: express.Request, res: express.Response) => {
  try {
    const { theme } = req.body;

    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    if (theme.length > 200) {
      return res.status(400).json({ error: 'Theme description too long' });
    }

    // Use Imagen 4.0 API for image generation
    const response = await ai.models.generateImages({
      model: GEMINI_CONFIG.MODEL_NAMES.IMAGE, // imagen-4.0-generate-001
      prompt: `Create a professional and serene wallpaper background with a theme of: ${theme}.

STRICT GUIDELINES:
1. CONTENT: Must be strictly beautiful, peaceful, and inspiring Islamic art.
2. STYLE: High-quality minimalist digital art, cinematic lighting, soft gradients.
3. COMPOSITION: NO text in the image. NO human faces. NO animals.
4. MOOD: Peaceful, spiritual, contemplative.
5. COLORS: Warm, calming colors that inspire reflection.`,
      config: {
        numberOfImages: 1,
        includeRaiReason: true,
      }
    });

    console.log('🖼️ Imagen Response:', response);

    if (response?.generatedImages && response.generatedImages.length > 0) {
      const imageBytes = response.generatedImages[0]?.image?.imageBytes;
      if (imageBytes) {
        return res.json({
          image: `data:image/png;base64,${imageBytes}`
        });
      }
    }

    // Check for RAI filtering
    if (response?.generatedImages?.[0]?.raiFilteredReason) {
      const reason = response.generatedImages[0].raiFilteredReason;
      console.warn('⚠️ Image blocked by RAI filter:', reason);
      return res.status(400).json({
        error: 'Image generation blocked by content filter',
        reason
      });
    }

    // No image generated
    res.status(500).json({ error: 'Failed to generate image. No image data returned.' });
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
