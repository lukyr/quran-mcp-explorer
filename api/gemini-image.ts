/**
 * Vercel Serverless Function: Gemini Image Generation Proxy
 * Securely proxies image generation requests to Google Gemini API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_CONFIG } from '../constants/index';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '' });

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sahabatquran.com',
  'https://sahabat-quran.vercel.app',
];

// Rate limiting for image generation (more restrictive)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                   (req.headers['x-real-ip'] as string) ||
                   'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many image generation requests. Please try again later.' });
  }

  try {
    const { theme } = req.body;

    // Validate input
    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    if (theme.length > 200) {
      return res.status(400).json({ error: 'Theme description too long' });
    }

    // Call Gemini Image API using SDK
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
            return res.status(200).json({
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

    return res.status(500).json({ error: 'Failed to generate image. No candidates returned.' });

  } catch (error: any) {
    console.error('Image generation error:', error);
    return res.status(500).json({
      error: 'Image generation service error',
      message: error.message
    });
  }
}
