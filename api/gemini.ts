/**
 * Vercel Serverless Function: Gemini AI Proxy
 * Securely proxies requests to Google Gemini API
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

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

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
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const { message, history } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    // Prepare contents
    const contents = history && Array.isArray(history) && history.length > 0
      ? [...history, { role: 'user', parts: [{ text: message }] }]
      : [{ role: 'user', parts: [{ text: message }] }];

    // Prepare tools from config
    const tools = {
      functionDeclarations: GEMINI_CONFIG.TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as any
      }))
    };

    // Call Gemini API using SDK
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

    return res.status(200).json({
      text,
      toolCalls: toolCalls || undefined,
    });

  } catch (error: any) {
    console.error('Gemini API error:', error);
    return res.status(500).json({
      error: 'AI service error',
      message: error.message
    });
  }
}
